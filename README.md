# Smart Garage.AI — AI Garage Assistant

Local academic prototype for vehicle symptom assessment, reviewed Naive Bayes training, approximate repair costs, and nearby workshop browsing. React + Spring Boot + XAMPP MySQL/MariaDB. No hosted service is included.

## Existing project owner: apply the update

Read [START-HERE.md](START-HERE.md). `INSTALL-UPDATE.cmd` copies corrected files into the original project after saving a backup and applying the additive migration. It preserves local secrets, Git history and existing database records. It never pushes to GitHub.

## Features and actual behaviour

- Registration/login uses BCrypt and server-validated bearer sessions. Server-derived identity and vehicle ownership gate diagnosis. Admin routes require the database admin role.
- A vehicle must be saved and selected. Brand/model/year/fuel context comes from the database.
- Each vehicle's **New Diagnosis** starts a separate session. Successful messages and structured assessment/cost data are stored; refresh restores the active session. Legacy messages may have no structured cost card.
- English/Tamil/Sinhala voice input uses browser speech recognition. Support, permissions and Internet requirements depend on the browser/device. No fake transcripts are inserted.
- Naive Bayes uses user complaints from the current session, not just the latest short answer. Unknown words or weak evidence produce no category hint. Groq receives the bounded conversation and saved vehicle specs, asks clarifying questions, and produces a structured assessment.
- Groq may disagree with the classifier. Its assessed category, explanation and cost are kept consistent instead of overwriting its conclusion with a weak classifier label.
- A completed assessment may contain **AI_ESTIMATE** in LKR with parts/labour assumptions. This is an unverified approximate estimate, not a quote or live Sri Lankan market price. Missing/invalid estimates display **Unavailable**. Fixed demo price ranges have been removed.
- History, symptom context and diagnosis are saved together transactionally. Persistence failure returns an error instead of pretending data was saved.
- Garage Finder uses a locally maintained directory and Leaflet/OpenStreetMap. Locate Me displays position/accuracy; live tracking updates position until stopped. Distances are straight-line Haversine distances, not road travel distances or times.
- Directions open externally in Google Maps. Demo locations are labelled previews. The app does not implement turn-by-turn navigation. Inherited non-demo directory coordinates/contact details are approximate and not independently verified; confirm them before actual navigation.
- Admin can inspect user vehicles/symptoms/assessments/recommendations without password hashes; manage the catalogue/workshops; review/correct ML examples; retrain and roll back.

## Architecture

| Component | Responsibility |
|---|---|
| React pages and AppContext | Interface, authenticated API calls, vehicle/session state |
| MlModelPanel | Review, correct, approve/reject, train, view metrics, rollback |
| AuthFilter / AuthSessionService | Server bearer validation, role checks, logout revocation |
| DiagnosisController / GroqService | Vehicle/session validation, classifier context, Groq calls |
| DiagnosisPersistenceService | Atomic chat, symptom and diagnosis writes |
| NaiveBayesService / NbScorer | Java inference using trained JSON weights |
| RepairCostService | Validate optional approximate LKR estimates |
| MlAdminController / ml/train.py | Controlled reviewed retraining and activation |
| Nine MySQL tables | Users, vehicles/catalogue, conversations, symptoms, assessments, workshops, recommendations |

Python is used for training/evaluation only; no separate Python API server is needed. Local classification works offline. Groq answers and map tiles require Internet access.

## Requirements

- Windows with Java **JDK 17+**, Python 3.8+, Node.js 20+ and npm on PATH.
- XAMPP MySQL/MariaDB on port 3306. The updater targets the previously configured root account with no password.
- A Groq API key in `backend/src/main/resources/application-secret.properties` (ignored by Git).
- Maven wrapper downloads dependencies on first run. The existing project uses Spring Boot 4.1.1; dependency versions have not been silently downgraded.

## Fresh clone setup

For a NEW EMPTY database only. Existing installations should use the additive update below.

1. Start XAMPP MySQL. Create/select `vehicle_diagnosis_db` with utf8mb4 in phpMyAdmin.
2. Import `database/schema.sql`, then `database/seed_data_anonymized.sql`. These files now contain no DROP/DELETE commands. The seed provides catalogue data, not private history or login accounts.
3. Copy `backend/src/main/resources/application-secret.properties.example` to `application-secret.properties`. Set your own `groq.api.key`.
4. Check `application.properties` for the local database URL, username and password. Default is root with an empty password. Do not commit real passwords.
5. Start the app and register through the form. There are **no pre-created demo passwords**.
6. To create the first admin, the local database owner can run this in phpMyAdmin, substituting the account just registered:

```sql
UPDATE users SET Is_Admin = 1 WHERE email = 'your-registered-email@example.com';
```

Log out and back in. Email alone does not grant administration; a database role is explicitly assigned. Normal registration always creates a non-admin user.

## Existing database: safe update

`INSTALL-UPDATE.cmd` backs up the live database and files before applying `database/migrations/2026_09_24_safe_update.sql` to the original project. It stops if backup fails. Existing application.properties, secrets and Git metadata are preserved. Approved ML review data is kept; the serving classifier is reset to the packaged baseline consistently with its state file. Previously generated candidate models remain available locally.

For password-protected MySQL or a non-default installation: export the live database first, select it in phpMyAdmin, then import **only** `database/migrations/2026_09_24_safe_update.sql`. Apply the code files while retaining your secret configuration. Do not import schema or seed over live data.

The migration checks columns before adding them and does not delete records, rewrite historical facts or invent missing values. New fields include diagnosis `session_id`, chat `metadata_json`, and missing cost/recommendation metadata. Legacy NULLs are retained: unknown safety is not safe, missing costs are unavailable, and optional profile fields can legitimately remain empty.

## Run locally

Double-click `START-BACKEND.cmd` and `START-FRONTEND.cmd` from the project root. For a fresh setup, first run `npm ci` in frontend. Equivalent commands in separate terminals:

```text
cd backend
mvnw.cmd spring-boot:run
```

```text
cd frontend
npm ci
npm run dev -- --host
```

Use the exact HTTPS Local/Network URL printed by Vite. Frontend `/api` calls proxy to `http://localhost:8080`. mkcert discovers current interfaces instead of fixing one old LAN IP.

Phone mic/GPS require supported APIs, permissions and a trusted secure connection. Use the same Wi-Fi; install only your own development public CA certificate if necessary. Never share its private key. Bypassing a certificate warning is not proof that secure browser APIs will work.

Backend restart clears in-memory sessions, so sign in again. Refresh preserves a still-valid session. Each PC has its own database; logging in with an email does not connect separate local installations. Shared remote data requires a shared hosted backend/database, outside this local prototype.

## ML dataset, training and limitations

[Dataset](ml/data/vehicle_symptoms_dataset.json): 112 English examples, 16 per category across seven categories. Supplied provenance tags are 70 `academic_seed_benchmark` and 42 `synthetic_variation`. Exact reference citations/group identifiers were not supplied. Treat it as illustrative academic data, not a validated real-repair dataset. Synthetic/paraphrase similarity can inflate random-split scores.

Multinomial Naive Bayes uses bag-of-words counts and Laplace smoothing (alpha=1). Deterministic seed-42 stratification yields **91 training and 21 evaluation examples**, three evaluation examples per class. Vocabulary is learned only on training data. Exact normalized duplicate candidates are excluded; evaluation-set duplicates are rejected. Near-paraphrase detection is not implemented.

| Baseline measure | Value |
|---|---:|
| Accuracy | 61.90% (13/21) |
| Macro F1 | 0.5976 |
| Macro precision | 0.6810 |
| Macro recall | 0.6190 |

[Full report](ml/models/evaluation_report_v1.0.0.json) and Admin → ML Model show per-class results and a 7×7 confusion matrix. Classifier probabilities are uncalibrated. Diagnosis confidence is an **LLM self-reported estimate**, not measured model accuracy.

```text
python ml/evaluate.py
python ml/verify_inference.py
python -m unittest discover -s ml/tests -v
```

Parity verification actually compiles and executes the production Java `NbScorer`, comparing all class probabilities with Python on 12 fixtures. It measures implementation agreement, not diagnostic quality.

### Reviewed retraining

1. Admin → ML Model: review a completed diagnosis.
2. Correct its category and edit symptom text into anonymized English. Remove names/addresses/other personal data; backend redaction additionally handles common email/phone patterns.
3. Approve or reject explicitly. Chat storage alone does **not** train the model. LLM outputs are not automatically ground truth.
4. Train approved examples. Deduplicated examples are added only to training. Concurrent jobs are blocked; generated files use replacement writes.
5. A content-versioned candidate must meet or exceed baseline accuracy **and** macro F1 to activate. Rejection keeps the actual previous model/version. The API reloads Java after success and reports reload failure.
6. Restore baseline rolls back to v1.0.0. CLI: `python ml/train.py` or `python ml/train.py --rollback`; restart the backend after CLI changes.

The small held-out set is reused for activation, so it is a **development benchmark**, not an independent final test. Do not claim automatic improvement or production readiness. Larger independently labelled data and an untouched final test set are future work. Naive Bayes is English-only; Groq handles Tamil/Sinhala while classification may abstain.

Private approved examples and generated candidate artifacts are ignored by Git. Baseline models, source dataset and maintained tests are retained. Run the backend from backend/ as the launcher does.

## Verification before presentation / push

`CHECK-PC.cmd` runs seven Python regressions, actual Java/Python parity, baseline evaluation, database-independent Java unit tests and frontend build. The full application context test requires a running configured DB/key; build success alone does not prove live Groq/phone behaviour.

Manual checks after starting the servers:

1. Login/refresh; logout blocks diagnosis/admin access.
2. Add/select vehicle, describe brakes squeaking, answer a follow-up with “yes”: assessment category must remain consistent with the whole complaint.
3. Completed assessment shows approximate LKR range or Unavailable; refresh restores its cost card.
4. New Diagnosis and vehicle changes isolate context; garage suggestions follow that vehicle/session.
5. Voice, Locate Me and Start/Stop Tracking work on the actual phone.
6. Admin review/correct/approve → train → view serving metrics → rollback. Invalid categories and evaluation-set duplicates cannot enter training.
7. Inspect saved diagnosis/cost through admin/phpMyAdmin. A persistence error must be visible, not silently skipped.

Verification evidence supplied from the owner's Windows PC on 2026-09-24: seven Python tests passed, Java/Python scoring parity passed on twelve fixtures, four Java unit tests passed with BUILD SUCCESS, and the frontend production build passed. Browser screenshots demonstrate login, vehicle gating, multi-turn diagnosis, approximate repair cost, restored conversation/cost, location display, external Google Maps directions, and admin review/retraining.

The local reviewed candidate `candidate_5859ed974384` was shown ACTIVATED with 93 training examples, 21 evaluation examples, accuracy 71.43% (15/21) and macro F1 0.7095. This is user-supplied runtime evidence; the committed baseline report remains 61.90%. Local private candidate files are not distributed. Phone verification and final Git staging review remain owner checks.

The final small patch preserves this trained candidate and changes only UI, dependency manifests and the Hibernate DDL setting. Existing migrated schemas use `spring.jpa.hibernate.ddl-auto=none`; future schema changes must use explicit migrations. This prevents automatic foreign-key column alterations; it does not convert existing column types.


## Team contributions

These four names/areas were recorded in the uploaded README. Git history was not included, so they are **reported, not independently verified**. Confirm with the team before submission. A fifth member's details were not supplied.

| Member | Reported area |
|---|---|
| Mohamed Ibrahim Mohamed Isfak | Full-stack integration and ML architecture |
| Sasika Dinushankha | Backend security and core services |
| Sanduni Navodya Thilakasiri | Administration and frontend UI |
| Maryam Mohamed Mihlar | Database design and data modelling |
| Fifth member — team to complete | Actual contribution to be provided |

AI-assisted changes do not establish which student originally implemented a subsystem. Replace the reported areas with agreed evidence-based contributions.

## GitHub handover

Commit source, fresh schema, additive migrations, catalogue seed, baseline models, maintained tests and README. Exclude secrets, private certificates, personal SQL dumps, private review text, caches and dependencies/build output. `.gitignore` does not untrack existing commits: inspect `git status` and `git ls-files` before pushing. No script commits, pushes, force-pushes or deploys.
