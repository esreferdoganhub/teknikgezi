// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, update, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
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

// Gönderilen soruların önbelleği
let submittedQuestionsCache = {};

// Add reference to the submitted questions list element
const submittedQuestionsList = document.getElementById('submittedQuestionsList');

// 'submittedQuestions' verisindeki değişiklikleri dinleyin
onValue(ref(db, 'submittedQuestions'), (snapshot) => {
    const submittedQuestions = snapshot.val() || {};
    submittedQuestionsCache = submittedQuestions; // Önbelleği güncelleyin

    // Clear the submitted questions list
    submittedQuestionsList.innerHTML = '';

    // Update submitted questions list
    Object.entries(submittedQuestions).forEach(([key, data]) => {
        const li = document.createElement('li');
        li.textContent = data.originalText || data;
        submittedQuestionsList.appendChild(li);
    });

    const checkboxes = document.querySelectorAll('input[name="questions"]');

    // Reset all checkboxes first
    checkboxes.forEach(checkbox => {
        const listItem = checkbox.closest('li');
        // Enable checkbox and remove submitted state
        checkbox.disabled = false;
        checkbox.checked = false;
        checkbox.removeAttribute('disabled');
        
        // Remove submitted class
        if (listItem) {
            listItem.classList.remove('submitted');
        }
        
        // Remove badge if exists
        const badge = checkbox.parentElement.querySelector('.badge');
        if (badge) {
            badge.remove();
        }
    });

    // Then process submitted questions
    if (submittedQuestions) {
        Object.entries(submittedQuestions).forEach(([key, data]) => {
            const checkbox = document.querySelector(`input[value="${sanitizeKey(data.originalText || data)}"]`);
            if (checkbox) {
                checkbox.disabled = true;
                checkbox.checked = true;

                const listItem = checkbox.closest('li');
                if (listItem) {
                    listItem.classList.add('submitted');
                }

                if (!checkbox.parentElement.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success';
                    badge.textContent = 'Gönderildi';
                    checkbox.parentElement.appendChild(badge);
                }
            }
        });
    }
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

            // Eğer soru zaten gönderildiyse uyarı verme
            if (submittedQuestionsCache && submittedQuestionsCache[safeKey]) {
                alert(`"${checkbox.value}" sorusu zaten gönderildi.`);
                return;
            }

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

// Sıfırlama butonu için event listener
document.getElementById('resetBtn').addEventListener('click', async function() {
    if (!auth.currentUser) {
        alert('Lütfen önce giriş yapın');
        return;
    }

    if (!confirm('Tüm gönderilmiş soruları sıfırlamak istediğinizden emin misiniz?')) {
        return;
    }

    try {
        // Clear Firebase data
        await set(ref(db, 'submittedQuestions'), null);
        
        // Clear cache
        submittedQuestionsCache = {};
        
        // Clear submitted questions list
        submittedQuestionsList.innerHTML = '';
        
        // Reset UI elements
        document.querySelectorAll('input[name="questions"]').forEach(checkbox => {
            // Enable checkbox
            checkbox.disabled = false;
            checkbox.checked = false;
            
            // Remove submitted styling
            const label = checkbox.closest('label');
            if (label) {
                label.style.textDecoration = 'none';
                label.style.color = '';
                label.style.opacity = '1';
                label.style.pointerEvents = 'auto';
            }
            
            // Remove badge if exists
            const badge = label?.querySelector('.badge');
            if (badge) {
                badge.remove();
            }
            
            // Remove submitted class from parent elements
            const listItem = checkbox.closest('li');
            if (listItem) {
                listItem.classList.remove('submitted');
            }
            
            // Ensure the checkbox is clickable
            checkbox.removeAttribute('disabled');
            checkbox.style.cursor = 'pointer';
        });

        alert('Sorular başarıyla sıfırlandı!');
    } catch (error) {
        console.error('Sıfırlama hatası:', error);
        alert('Soruları sıfırlarken bir hata oluştu: ' + error.message);
    }
});

// Login function
window.login = async function() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    console.log('Login attempt with:', email); // Debug log
    
    // Check for admin credentials
    if (email === 'öğrenci' && password === '123456') {
        document.body.classList.add('admin');
        console.log('Admin login successful');
        alert('Giriş başarılı!');
        document.getElementById('logoutBtn').style.display = 'inline-block';
        // Additional admin-specific code can go here
        return;
    }

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
        document.body.classList.add('admin');
        document.getElementById('logoutBtn').style.display = 'inline-block';
        
        // Refresh questions to show admin controls
        fetchAndDisplayQuestions();
    } else {
        console.log('User is signed out');
        document.body.classList.remove('admin');
        document.getElementById('logoutBtn').style.display = 'none';
        
        // Refresh questions to hide admin controls
        fetchAndDisplayQuestions();
    }
});

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Simple admin authentication
    if (username === 'admin' && password === '123456') {
        document.body.classList.add('admin');
        errorMessage.textContent = '';
        document.querySelector('.login-form').style.display = 'none';
    } else {
        errorMessage.textContent = 'Invalid username or password';
        document.body.classList.remove('admin');
    }
}

// Function to fetch and display questions
function fetchAndDisplayQuestions() {
    const questionsRef = collection(db, 'questions');
    const questionList = document.getElementById('questionList');
    const checkboxes = document.querySelectorAll('input[name="questions"]');
    
    // Show all questions by default
    checkboxes.forEach(checkbox => {
        checkbox.parentElement.style.display = 'block';
    });
    
    // Make sure question form container is visible
    document.getElementById('questionFormContainer').style.display = 'block';
}

// Function to automatically log in as student
function autoLogin() {
    // Check if already logged in via session storage
    const isAdmin = sessionStorage.getItem('isAdmin');
    
    if (!isAdmin) {
        // Set admin status in session storage
        sessionStorage.setItem('isAdmin', 'true');
    }

    // Add admin class and ensure it persists
    document.body.classList.add('admin');
    
    // Prevent any accidental class removal by using a timeout
    setTimeout(() => {
        if (!document.body.classList.contains('admin')) {
            document.body.classList.add('admin');
        }
    }, 100);

    // Fetch questions after ensuring admin state
    fetchAndDisplayQuestions();
    
    console.log('Auto login completed');
}

// Call autoLogin when page loads
window.onload = function() {
    autoLogin();
    fetchAndDisplayQuestions();
};