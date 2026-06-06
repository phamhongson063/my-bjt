import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let app;

export function initProgress(appRef) {
  app = appRef;

  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    signOut(app.auth);
  });

  app.completeBtn.addEventListener("click", async () => {
    if (!app.currentUser) {
      alert("Cần đăng nhập để lưu tiến độ.");
      return;
    }
    app.completeBtn.disabled = true;
    try {
      await setDoc(
        doc(app.db, "users", app.currentUser.uid, "progress", app.lessonId),
        {
          lessonId: app.lessonId,
          completedAt: serverTimestamp(),
          quizCorrect: app.quizScores.correct,
          quizTotal: app.quizScores.total,
        }
      );
      app.completeStatus.textContent = `✓ Đã lưu! ${
        app.quizScores.total > 0
          ? `Score: ${app.quizScores.correct}/${app.quizScores.total}`
          : ""
      }`;
      app.completeStatus.classList.remove("hidden");
    } catch (err) {
      alert("Lưu thất bại: " + err.message);
      app.completeBtn.disabled = false;
    }
  });
}

export async function progressOnAuth(user) {
  if (!user) return;
  try {
    const snap = await getDoc(
      doc(app.db, "users", user.uid, "progress", app.lessonId)
    );
    if (snap.exists()) {
      app.completeStatus.textContent = `✓ Bài này đã hoàn thành trước đó.`;
      app.completeStatus.classList.remove("hidden");
    }
  } catch {}
}
