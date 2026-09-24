package com.garagegroup.garage_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.garagegroup.garage_backend.entity.*;
import com.garagegroup.garage_backend.repository.*;
import com.garagegroup.garage_backend.service.NaiveBayesService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@RestController
@RequestMapping("/api/admin/ml")
public class MlAdminController {
    private final DiagnosisRepository diagnoses;
    private final SymptomRepository symptoms;
    private final NaiveBayesService model;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock jobLock = new ReentrantLock();
    private static final Set<String> CLASSES = Set.of("air_conditioning", "brake_system", "cooling_system",
        "electrical_battery", "engine_mechanical", "tires_suspension", "transmission");
    public MlAdminController(DiagnosisRepository diagnoses, SymptomRepository symptoms, NaiveBayesService model) {
        this.diagnoses = diagnoses; this.symptoms = symptoms; this.model = model;
    }
    private boolean admin(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        return user instanceof User && ((User) user).isAdmin();
    }
    private Path root() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve("ml")) ? cwd : cwd.getParent();
    }
    private Path approvals() { return root().resolve("ml/data/approved_candidates.json"); }
    private List<Map<String,Object>> readApprovals() throws Exception {
        if (!Files.exists(approvals())) return new ArrayList<>();
        return mapper.readValue(Files.readString(approvals()), new TypeReference<List<Map<String,Object>>>() {});
    }
    private void saveApprovals(List<Map<String,Object>> entries) throws Exception {
        Path target = approvals(); Files.createDirectories(target.getParent());
        Path temp = Files.createTempFile(target.getParent(), "review-", ".tmp");
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(), entries);
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
        } finally { Files.deleteIfExists(temp); }
    }
    @GetMapping("/candidates")
    public ResponseEntity<?> candidates(HttpServletRequest request) throws Exception {
        if (!admin(request)) return ResponseEntity.status(403).build();
        if (!jobLock.tryLock()) return ResponseEntity.status(409).body(Map.of("error", "ML job in progress"));
        try {
            List<Map<String,Object>> reviews = readApprovals();
            List<Map<String,Object>> result = new ArrayList<>();
            for (Diagnosis d : diagnoses.findAll(org.springframework.data.domain.PageRequest.of(0, 100,
                    org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))).getContent()) {
                if (d.getResponseType() != Diagnosis.ResponseType.DIAGNOSIS || d.getSymptomId() == null) continue;
                Map<String,Object> row = new LinkedHashMap<>();
                row.put("diagnosisId", d.getDiagnosisId()); row.put("faultName", d.getFaultName());
                row.put("symptomText", symptoms.findById(d.getSymptomId()).map(Symptom::getDescription).orElse(""));
                row.put("status", "PENDING");
                for (Map<String,Object> review : reviews) {
                    if (String.valueOf(review.get("id")).equals(String.valueOf(d.getDiagnosisId()))) {
                        row.putAll(review); break;
                    }
                }
                result.add(row);
            }
            return ResponseEntity.ok(result);
        } finally { jobLock.unlock(); }
    }
    @PostMapping("/candidates/{id}/{action:approve|reject}")
    public ResponseEntity<?> review(@PathVariable Long id, @PathVariable String action,
            @RequestBody(required=false) Map<String,String> body, HttpServletRequest request) throws Exception {
        if (!admin(request)) return ResponseEntity.status(403).build();
        if (!jobLock.tryLock()) return ResponseEntity.status(409).body(Map.of("error", "ML job in progress"));
        try {
            Diagnosis d = diagnoses.findById(id).orElse(null);
            if (d == null || d.getResponseType() != Diagnosis.ResponseType.DIAGNOSIS)
                return ResponseEntity.badRequest().body(Map.of("error", "Only completed diagnoses can be reviewed"));
            String category = body == null ? null : body.get("reviewedCategory");
            String text = body == null ? null : body.get("symptomText");
            if (action.equals("approve") && (category == null || !CLASSES.contains(category) || text == null || text.isBlank() || text.length() > 4000))
                return ResponseEntity.badRequest().body(Map.of("error", "Provide reviewed English symptom text (1–4000 characters) and a supported category"));
            List<Map<String,Object>> reviews = readApprovals();
            reviews.removeIf(row -> String.valueOf(row.get("id")).equals(String.valueOf(id)));
            Map<String,Object> row = new LinkedHashMap<>(); row.put("id", id);
            row.put("status", action.equals("approve") ? "APPROVED" : "REJECTED");
            if (action.equals("approve")) {
                // Redact common identifiers; the admin must review other personal details before approval.
                text = text.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[email]")
                           .replaceAll("\\+?\\d[\\d ()-]{7,}\\d", "[phone]");
                row.put("symptomText", text.trim()); row.put("reviewedCategory", category);
                row.put("proposedCategory", d.getFaultName());
            }
            row.put("reviewedAt", java.time.Instant.now().toString());
            reviews.add(row); saveApprovals(reviews);
            return ResponseEntity.ok(row);
        } finally { jobLock.unlock(); }
    }
    @PostMapping("/retrain")
    public ResponseEntity<?> retrain(HttpServletRequest request) { return runJob(false, request); }
    @PostMapping("/rollback")
    public ResponseEntity<?> rollback(HttpServletRequest request) { return runJob(true, request); }
    private ResponseEntity<?> runJob(boolean rollback, HttpServletRequest request) {
        if (!admin(request)) return ResponseEntity.status(403).build();
        if (!jobLock.tryLock()) return ResponseEntity.status(409).body(Map.of("error", "Another ML job is running"));
        Path log = null; Process process = null;
        try {
            log = Files.createTempFile("garage-training-", ".log");
            List<String> args = new ArrayList<>(List.of("python", root().resolve("ml/train.py").toString()));
            if (rollback) args.add("--rollback");
            process = new ProcessBuilder(args).directory(root().toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            if (!process.waitFor(90, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return ResponseEntity.status(504).body(Map.of("error", "Training exceeded 90 seconds. Check the process before clearing ml/.training.lock."));
            }
            String output = Files.readString(log);
            if (process.exitValue() != 0) return ResponseEntity.status(500).body(Map.of("error", "ML job failed", "output", output));
            model.loadModel();
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "output", output, "modelInfo", readState()));
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            if (process != null && process.isAlive()) process.destroyForcibly();
            return ResponseEntity.status(500).body(Map.of("error", "ML job or model reload failed. Review server logs; restart after resolving.", "detail", e.getClass().getSimpleName()));
        } finally {
            if (log != null) try { Files.deleteIfExists(log); } catch (Exception ignored) {}
            jobLock.unlock();
        }
    }
    private Map<String,Object> readState() throws Exception {
        Path state = root().resolve("ml/models/serving_model.json");
        if (!Files.exists(state)) return new LinkedHashMap<>(Map.of("servingVersion", "v1.0.0", "status", "ACTIVE", "rollbackAvailable", true));
        return mapper.readValue(Files.readString(state), new TypeReference<Map<String,Object>>() {});
    }
    @GetMapping("/model-info")
    public ResponseEntity<?> info(HttpServletRequest request) throws Exception {
        if (!admin(request)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(readState());
    }
    @GetMapping("/evaluation")
    public ResponseEntity<?> evaluation(HttpServletRequest request) throws Exception {
        if (!admin(request)) return ResponseEntity.status(403).build();
        String version = String.valueOf(readState().get("servingVersion"));
        if (!version.matches("[A-Za-z0-9_.-]+")) throw new IllegalStateException("Invalid serving version");
        Path report = root().resolve("ml/models/evaluation_report_" + version + ".json");
        return ResponseEntity.ok(mapper.readValue(Files.readString(report), Map.class));
    }
}
