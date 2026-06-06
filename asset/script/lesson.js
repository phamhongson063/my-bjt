import { firebaseConfig } from "../../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { LessonApp } from "./core/app.js";
import "./plugins/index.js";

const fb = initializeApp(firebaseConfig);
const lessonApp = new LessonApp({
  auth: getAuth(fb),
  db: getFirestore(fb),
});
lessonApp.boot();
