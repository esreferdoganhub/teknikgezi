import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAVE9VzrMKyQFwV7W8matrge8oluplv3R4",
    authDomain: "teknikgezi-b26f1.firebaseapp.com",
    projectId: "teknikgezi-b26f1",
    storageBucket: "teknikgezi-b26f1.firebasestorage.app",
    messagingSenderId: "122421251437",
    appId: "1:122421251437:web:9231a88b314788ceb2de64",
    measurementId: "G-W55YQGHYQ1"
  };
  

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

document.getElementById('questionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const selectedQuestions = Array.from(document.querySelectorAll('input[name="questions"]:checked')).map(el => el.value);
    set(ref(database, 'questions/'), {
        selectedQuestions: selectedQuestions
    }).then(() => {
        alert('Sorular başarıyla gönderildi!');
    }).catch((error) => {
        console.error('Hata:', error);
    });
});