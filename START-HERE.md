# Apply this update to your existing Windows project

1. Keep your ORIGINAL project. Extract this ZIP into a separate folder beside it.
2. Stop the old frontend/backend using Ctrl+C in their terminals. Keep XAMPP MySQL running.
3. Double-click INSTALL-UPDATE.cmd in this extracted update folder.
4. Confirm the original project path displayed by the script, or paste its full path.
5. Wait for UPDATE APPLIED. The updater first saves a database and overwritten-file backup under GarageAssistantBackups beside the original project. It applies only an additive migration and preserves application-secret.properties, application.properties, .git and database records. It moves specifically named obsolete dumps/test files into that backup; it does not scan/delete unrelated folders.
6. Go back to the ORIGINAL project folder. Double-click CHECK-PC.cmd. If it fails, send the error text.
7. Double-click START-BACKEND.cmd, then START-FRONTEND.cmd. Keep both windows open.
8. Open the HTTPS Local URL printed by Vite, log in again, then use the README acceptance checklist.

The updater assumes your previously reported XAMPP root account has an empty password and database name vehicle_diagnosis_db. If that changed, backup fails and it stops; use the README manual migration procedure. Never import a seed over the live database.

No API key is included. Your original secret configuration stays in place. You do not need to edit Java/React code or replace individual files manually.

No Git commit or push is performed. The PC checks and a real diagnosis using your local Groq key still need to pass before pushing.
