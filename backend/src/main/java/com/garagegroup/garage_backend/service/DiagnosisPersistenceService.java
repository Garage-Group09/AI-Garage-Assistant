package com.garagegroup.garage_backend.service;

import com.garagegroup.garage_backend.entity.*;
import com.garagegroup.garage_backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class DiagnosisPersistenceService {
    private final ChatHistoryRepository chats;
    private final SymptomRepository symptoms;
    private final DiagnosisRepository diagnoses;
    public DiagnosisPersistenceService(ChatHistoryRepository chats, SymptomRepository symptoms, DiagnosisRepository diagnoses) {
        this.chats = chats; this.symptoms = symptoms; this.diagnoses = diagnoses;
    }
    @Transactional(rollbackFor = Exception.class)
    public Long save(Integer userId, Integer vehicleId, String sessionId, String message, String context,
                     GroqService.DiagnosisResult result, RepairCostService.CostEstimate cost,
                     Map<String, Object> response) throws Exception {
        Symptom symptom = new Symptom();
        symptom.setUserId(userId); symptom.setVehicleId(vehicleId); symptom.setDescription(context);
        symptoms.save(symptom);
        Diagnosis diagnosis = new Diagnosis();
        diagnosis.setSymptomId(symptom.getSymptomId()); diagnosis.setSessionId(sessionId);
        diagnosis.setResponseType(result.getResponseType());
        diagnosis.setModelUsed("hybrid-naivebayes+groq");
        if (result.getResponseType() == Diagnosis.ResponseType.DIAGNOSIS) {
            diagnosis.setFaultName(result.getFaultName()); diagnosis.setPossibleCause(result.getPossibleCause());
            diagnosis.setConfidenceLevel(result.getConfidence()); diagnosis.setSafeToDrive(result.getSafeToDrive());
            diagnosis.setMinCost(cost.getMinCost()); diagnosis.setMaxCost(cost.getMaxCost());
            diagnosis.setCostCurrency(cost.getCurrency()); diagnosis.setCostEstimateSource(cost.getSource());
            diagnosis.setCostAssumptions(cost.getAssumptions());
        } else { diagnosis.setPossibleCause(result.getReply()); }
        diagnoses.save(diagnosis);
        response.put("diagnosisId", diagnosis.getDiagnosisId());
        ChatHistory user = new ChatHistory();
        user.setUserId(userId); user.setVehicleId(vehicleId); user.setSessionId(sessionId);
        user.setSender(ChatHistory.Sender.user); user.setMessage(message); chats.save(user);
        ChatHistory ai = new ChatHistory();
        ai.setUserId(userId); ai.setVehicleId(vehicleId); ai.setSessionId(sessionId);
        ai.setSender(ChatHistory.Sender.ai); ai.setMessage(result.getReply());
        ai.setMetadataJson(new ObjectMapper().writeValueAsString(response)); chats.save(ai);
        return diagnosis.getDiagnosisId();
    }
}
