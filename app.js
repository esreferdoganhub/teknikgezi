import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, update, onValue, remove } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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
const db = getDatabase(app);
const auth = getAuth(app);

// Function to sanitize keys for Firebase
function sanitizeKey(text) {
    return text
        .toLowerCase()
        .replace(/[.#$\/\[\]?]/g, '')        // Remove Firebase invalid chars including '?'
        .replace(/[^a-z0-9_-]/g, '_')        // Replace non-alphanumerics with '_'
        .replace(/__+/g, '_')                // Replace multiple '_' with single
        .replace(/^_|_$/g, '');              // Trim leading/trailing '_'
}

// Listen for submitted questions and display in the submittedQuestionsList
onValue(ref(db, 'submittedQuestions/'), (snapshot) => {
    const submittedQuestions = snapshot.val() || {};
    const submittedQuestionsList = document.getElementById('submittedQuestionsList');
    submittedQuestionsList.innerHTML = ''; // Clear existing list

    Object.values(submittedQuestions).forEach(question => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.textContent = question.originalText;
        submittedQuestionsList.appendChild(listItem);
    });
});

// Listen for submitted questions to update admin form
onValue(ref(db, 'submittedQuestions/'), (snapshot) => {
    const submittedQuestions = snapshot.val() || {};

    document.querySelectorAll('input[name="questions"]').forEach(checkbox => {
        const safeKey = sanitizeKey(checkbox.value);
        if (submittedQuestions[safeKey]) {
            checkbox.disabled = true;
            if (checkbox.parentElement) {
                checkbox.parentElement.classList.add('submitted');
                // Prevent adding multiple badges
                if (!checkbox.parentElement.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success';
                    badge.textContent = 'Gönderildi';
                    checkbox.parentElement.appendChild(badge);
                }
            } else {
                console.warn('Checkbox has no parent element:', checkbox);
            }
        }
    });
});

// Form submission handler (Admin Only)
document.getElementById('questionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        if (!auth.currentUser) {
            throw new Error('Lütfen önce giriş yapın');
        }

        const selectedQuestions = Array.from(
            document.querySelectorAll('input[name="questions"]:checked')
        );

        if (selectedQuestions.length === 0) {
            throw new Error('Lütfen en az bir soru seçin');
        }

        const updates = {};
        selectedQuestions.forEach(checkbox => {
            const safeKey = sanitizeKey(checkbox.value);
            updates[`submittedQuestions/${safeKey}`] = {
                originalText: checkbox.value,
                safeKey: safeKey,
                timestamp: Date.now(),
                user: auth.currentUser.email
            };
        });

        // Update Firebase
        await update(ref(db), updates);
        alert('Sorular başarıyla kaydedildi!');
        
        // Update UI
        selectedQuestions.forEach(checkbox => {
            checkbox.disabled = true;
            if (checkbox.parentElement) {
                checkbox.parentElement.classList.add('submitted');
                // Prevent adding multiple badges
                if (!checkbox.parentElement.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success';
                    badge.textContent = 'Gönderildi';
                    checkbox.parentElement.appendChild(badge);
                }
            }
        });

    } catch (error) {
        console.error('Hata detayı:', error);
        alert(`Hata: ${error.message}`);
    }
});

// Reset Questions Function (Admin Only)
window.resetQuestions = async function() {
    if (!auth.currentUser) {
        alert('Bu işlemi yapmak için giriş yapmanız gerekiyor.');
        return;
    }

    const confirmReset = confirm('Tüm gönderilen soruları sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmReset) return;

    try {
        // Remove all submitted questions from Firebase
        await remove(ref(db, 'submittedQuestions/'));
        alert('Tüm sorular başarıyla sıfırlandı.');

        // Update UI: Enable all checkboxes and remove badges
        document.querySelectorAll('input[name="questions"]').forEach(checkbox => {
            checkbox.disabled = false;
            if (checkbox.parentElement) {
                checkbox.parentElement.classList.remove('submitted');
                const badge = checkbox.parentElement.querySelector('.badge');
                if (badge) {
                    badge.remove();
                }
            }
        });

    } catch (error) {
        console.error('Sıfırlama hatası:', error);
        alert(`Hata: ${error.message}`);
    }
};

// Login function
window.login = async function() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    console.log('Login attempt with:', email); // Debug log

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user);
        alert('Giriş başarılı!');
        document.getElementById('logoutBtn').style.display = 'inline-block';
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş hatası: ' + error.message);
    }
};

// Logout function
window.logout = function() {
    signOut(auth).then(() => {
        console.log('Logged out successfully');
        document.getElementById('logoutBtn').style.display = 'none';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
};

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is signed in:', user);
        // Optionally verify the email here
        if (user.email === 'your-admin-email@example.com') {
            document.body.classList.add('admin');
        } else {
            document.body.classList.remove('admin');
        }
        document.getElementById('logoutBtn').style.display = 'inline-block';
    } else {
        console.log('User is signed out');
        document.body.classList.remove('admin');
        document.getElementById('logoutBtn').style.display = 'none';
    }
});