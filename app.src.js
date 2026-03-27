        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
        import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
        import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

        // Your Firebase config
        const firebaseConfig = {
            apiKey: "AIzaSyBnP8V6xWabk0cfGhwY4AdPX829rPPRnf4",
            authDomain: "bourbon-d0505.firebaseapp.com",
            projectId: "bourbon-d0505",
            storageBucket: "bourbon-d0505.firebasestorage.app",
            messagingSenderId: "935278237286",
            appId: "1:935278237286:web:2b8183abb241ac932fffa7",
            measurementId: "G-TEV7YQWQBZ"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const db = getFirestore(app);
        const auth = getAuth(app);
        const storage = getStorage(app);

        let currentUserUid = null;
        let currentUserLikedDocs = [];
        let currentUserVault = []; // Store IDs of docs in personal vault
        let currentUserRole = 'user'; // user, vip, contributor, admin
        let currentlyViewingDoc = null;

        // Avatar Management for Logged in Users
        window.openAvatarModal = function () {
            if (!currentUserUid) return alert("Vui lòng đăng nhập để đổi avatar!");
            document.getElementById('avatarModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('avatarErrorMsg').innerText = '';
        }
        window.closeAvatarModal = function () {
            document.getElementById('avatarModal').classList.remove('active');
            document.body.style.overflow = '';
        }
        window.selectUserAvatar = function (url) {
            document.getElementById('customUserAvatarUrl').value = url;
            const imgs = document.querySelectorAll('#memeAvatars img');
            imgs.forEach(i => i.style.borderColor = 'transparent');
            event.target.style.borderColor = 'var(--neon-cyan)';
        }

        window.saveUserAvatar = async function (event) {
            if (!currentUserUid) return;
            const url = document.getElementById('customUserAvatarUrl').value.trim();
            if (!url) return;
            const btn = event.target;
            const errorMsg = document.getElementById('avatarErrorMsg');
            btn.innerText = 'Đang lưu...';
            try {
                await setDoc(doc(db, "users", currentUserUid), { avatarUrl: url }, { merge: true });
                errorMsg.style.color = 'var(--neon-cyan)';
                errorMsg.innerText = 'Đã cập nhật Avatar cá nhân!';
                const avatarDiv = document.getElementById('authorAvatar');
                avatarDiv.style.backgroundImage = `url('${url}')`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';

                // restore overlay
                const overlay = document.getElementById('editAvatarOverlay');
                if (overlay) {
                    avatarDiv.innerHTML = '';
                    avatarDiv.appendChild(overlay);
                }

                setTimeout(() => {
                    closeAvatarModal();
                    errorMsg.innerText = '';
                }, 1500);
            } catch (e) {
                errorMsg.style.color = '#ff5e5e';
                errorMsg.innerText = 'Lỗi: ' + e.message;
            }
            finally { btn.innerText = 'Lưu Avatar'; }
        }

        async function fetchUserLevelAvatar(uid) {
            try {
                const snap = await getDoc(doc(db, "users", uid));
                const avatarDiv = document.getElementById('authorAvatar');

                let activeAvatar = "";
                if (snap.exists()) {
                    const userData = snap.data();
                    if (userData.avatarUrl) activeAvatar = userData.avatarUrl;
                    currentUserLikedDocs = userData.likedDocs || [];
                    currentUserVault = userData.vault || [];
                    currentUserRole = userData.role || (uid === 'I3H5iU0XW5R5n4zY3L6z9L9z9L9z' ? 'admin' : 'user'); // Simple check or check email later
                }
                if (!activeAvatar) {
                    const defaultMemes = [
                        "https://i.postimg.cc/T1QXVkch/tai-xuong-(3).jpg",
                        "https://i.postimg.cc/qM0R2S4S/kamu-kan.jpg",
                        "https://i.postimg.cc/WzZktkmZ/tai-xuong-(2).jpg",
                        "https://i.postimg.cc/QCvF3xRK/tai-xuong-(1).jpg",
                        "https://i.postimg.cc/zfHPzdbJ/tai-xuong.jpg"
                    ];
                    // Random 1 trong các avatar có sẵn trong code
                    activeAvatar = defaultMemes[Math.floor(Math.random() * defaultMemes.length)];
                    // Lưu lại luôn để họ giữ được avatar này trừ khi đổi cái khác
                    setDoc(doc(db, "users", uid), { avatarUrl: activeAvatar }, { merge: true });
                }

                avatarDiv.style.backgroundImage = `url('${activeAvatar}')`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';
                avatarDiv.innerHTML = '';

                // Cập nhật lại list card nếu AllDocs đã tải xong
                if (allDocs.length > 0) {
                    const activeCat = document.querySelector('#homeCategories .cat-tag.active');
                    filterDocs(activeCat ? activeCat.innerText : 'Tất cả');
                }
                const overlay = document.createElement('div');
                overlay.id = "editAvatarOverlay";
                overlay.className = "edit-avatar-overlay";
                overlay.innerHTML = "Đổi Avatar<br>Cá Nhân";
                overlay.onclick = window.openAvatarModal;
                avatarDiv.appendChild(overlay);
            } catch (e) { console.error(e); }
        }

        async function fetchAdminGlobalAvatar() {
            const avatarDiv = document.getElementById('authorAvatar');
            const defaultMemes = [
                "https://i.postimg.cc/T1QXVkch/tai-xuong-(3).jpg",
                "https://i.postimg.cc/qM0R2S4S/kamu-kan.jpg",
                "https://i.postimg.cc/WzZktkmZ/tai-xuong-(2).jpg",
                "https://i.postimg.cc/QCvF3xRK/tai-xuong-(1).jpg",
                "https://i.postimg.cc/zfHPzdbJ/tai-xuong.jpg"
            ];
            const randomAvatar = defaultMemes[Math.floor(Math.random() * defaultMemes.length)];
            avatarDiv.style.backgroundImage = `url('${randomAvatar}')`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.innerHTML = '';
        }

        // UI Variables (Preview Modal)
        const modal = document.getElementById('previewModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDesc');

        // Global functions for inline HTML click events
        window.openModal = async function (docId) {
            const data = allDocs.find(d => d.id === docId);
            if (!data) return;
            currentlyViewingDoc = data;

            modalTitle.innerText = data.title || 'Tài liệu';
            modalDesc.innerHTML = `<p>${data.description || ''}</p><br><p style="font-size:13px; color:var(--text-secondary)">👁 Lượt xem: <b style="color:var(--neon-cyan)">${data.views || 0}</b> &nbsp;&nbsp;|&nbsp;&nbsp; ⬇ Lượt tải: <b style="color:#00ffaa">${data.downloads || 0}</b></p>`;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // --- Nhúng Video hướng dẫn (nếu có) ---
            const videoArea = document.getElementById('videoEmbedArea');
            const videoFrame = document.getElementById('videoEmbedFrame');
            if (data.videoUrl) {
                let videoEmbedUrl = data.videoUrl;
                // YouTube: chuyển sang embed
                const ytMatch = data.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
                } else {
                    // Google Drive video
                    const gdvMatch = data.videoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (gdvMatch) videoEmbedUrl = `https://drive.google.com/file/d/${gdvMatch[1]}/preview`;
                }
                videoFrame.src = videoEmbedUrl;
                videoArea.style.display = 'block';
            } else {
                videoFrame.src = '';
                videoArea.style.display = 'none';
            }

            // --- Nhúng xem trước file ---
            const iframe = document.getElementById('filePreviewFrame');
            const loading = document.getElementById('previewLoading');
            const previewArea = document.getElementById('filePreviewArea');
            const allowPreview = data.allowPreview !== false; // mặc định true nếu không có trường

            if (!allowPreview) {
                iframe.style.display = 'none';
                loading.style.display = 'block';
                loading.innerHTML = `
                    <div style="text-align:center; padding:40px;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" style="margin-bottom:16px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <p style="color:var(--text-secondary); font-size:15px; font-weight:500;">Tài liệu này không cho phép xem trước</p>
                        <p style="color:var(--text-secondary); font-size:13px; margin-top:8px; opacity:0.6;">Tải xuống để xem nội dung đầy đủ</p>
                    </div>`;
                previewArea.style.minHeight = '160px';
            } else {
                previewArea.style.minHeight = '500px';
                iframe.style.display = 'none';
                loading.style.display = 'block';
                loading.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2" style="animation:spin 1s linear infinite;margin-bottom:15px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg><p>Đang tải xem trước...</p>';

                if (data.fileUrl) {
                    let previewUrl = data.fileUrl;
                    const gdriveMatcher = data.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (gdriveMatcher) {
                        previewUrl = `https://drive.google.com/file/d/${gdriveMatcher[1]}/preview`;
                    } else {
                        previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(data.fileUrl)}&embedded=true`;
                    }
                    iframe.src = previewUrl;
                } else {
                    loading.innerHTML = '<p style="color:var(--text-secondary)">Tài liệu này chưa có link xem trước.</p>';
                }
            }

            try {
                await updateDoc(doc(db, "documents", docId), { views: increment(1) });
                data.views = (data.views || 0) + 1;
            } catch (e) { }
        };

        window.toggleLike = async function (docId) {
            if (!currentUserUid) {
                alert('Vui lòng đăng nhập để thả tim tài liệu!');
                return window.openAuthModal();
            }
            try {
                const docRef = doc(db, "documents", docId);
                const userRef = doc(db, "users", currentUserUid);
                if (currentUserLikedDocs.includes(docId)) {
                    await updateDoc(docRef, { likes: increment(-1) });
                    await updateDoc(userRef, { likedDocs: arrayRemove(docId) });
                    currentUserLikedDocs = currentUserLikedDocs.filter(id => id !== docId);
                } else {
                    await updateDoc(docRef, { likes: increment(1) });
                    await setDoc(userRef, { likedDocs: arrayUnion(docId) }, { merge: true });
                    currentUserLikedDocs.push(docId);
                }
                const data = allDocs.find(d => d.id === docId);
                if (data) {
                    data.likes = (data.likes || 0) + (currentUserLikedDocs.includes(docId) ? 1 : -1);
                }
                renderCurrentGrid();
            } catch (e) { console.error("Error toggling like:", e); }
        };

        window.toggleVault = async function (docId) {
            if (!currentUserUid) {
                alert('Vui lòng đăng nhập để lưu vào Thư viện Cá nhân!');
                return window.openAuthModal();
            }
            try {
                const userRef = doc(db, "users", currentUserUid);
                const isSaved = currentUserVault.includes(docId);
                
                if (isSaved) {
                    await updateDoc(userRef, { vault: arrayRemove(docId) });
                    currentUserVault = currentUserVault.filter(id => id !== docId);
                } else {
                    await setDoc(userRef, { vault: arrayUnion(docId) }, { merge: true });
                    currentUserVault.push(docId);
                }

                renderCurrentGrid();
                
                // Show floating notification
                const msg = isSaved ? 'Đã xóa khỏi Thư viện!' : 'Đã lưu vào Thư viện Cá nhân!';
                alert(msg); // Simplified for now
            } catch (e) { console.error("Error toggling vault:", e); }
        };

        function renderCurrentGrid() {
            const activeCat = document.querySelector('#homeCategories .cat-tag.active');
            filterDocs(activeCat ? activeCat.getAttribute('data-cat') || activeCat.innerText : 'Tất cả');
        }

        window.downloadDoc = async function () {
            if (!currentlyViewingDoc) return;
            try {
                await updateDoc(doc(db, "documents", currentlyViewingDoc.id), { downloads: increment(1) });
                currentlyViewingDoc.downloads = (currentlyViewingDoc.downloads || 0) + 1;
                window.open(currentlyViewingDoc.fileUrl, '_blank');
                closeModal();
            } catch (e) {
                alert('Có lỗi xảy ra khi lấy link tải: ' + e.message);
            }
        };

        window.reportDoc = async function () {
            if (!currentlyViewingDoc) return;
            if (!currentUserUid) {
                alert('Vui lòng đăng nhập để gửi báo cáo link hỏng!');
                return window.openAuthModal();
            }
            try {
                await addDoc(collection(db, "reports"), {
                    docId: currentlyViewingDoc.id,
                    docTitle: currentlyViewingDoc.title,
                    reporterUid: currentUserUid,
                    status: 'pending',
                    timestamp: serverTimestamp()
                });
                alert('Cám ơn bạn đã báo cáo. Quản trị viên sẽ sớm kiểm tra lại link!');
                closeModal();
            } catch (e) {
                alert('Lỗi gửi báo cáo: ' + e.message);
            }
        };

        window.closeModal = function () {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        // ── Contribute Modal ──
        const contributeModal = document.getElementById('contributeModal');

        window.openContributeModal = async function () {
            if (!currentUserUid) return window.openAuthModal();
            contributeModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('ctbStatusMsg').style.display = 'none';
            document.getElementById('ctbSubmitBtn').disabled = false;
            document.getElementById('ctbSubmitBtn').innerText = 'Gửi Đóng Góp →';

            // Load tags vào datalist
            const dl = document.getElementById('ctbTagList');
            dl.innerHTML = '';
            try {
                const snap = await getDocs(collection(db, 'tags'));
                snap.forEach(d => {
                    if (d.data().name) dl.innerHTML += `<option value="${d.data().name}">`;
                });
            } catch (e) {}
        };

        window.closeContributeModal = function () {
            contributeModal.classList.remove('active');
            document.body.style.overflow = '';
            document.getElementById('ctbTitle').value = '';
            document.getElementById('ctbDesc').value = '';
            document.getElementById('ctbTag').value = '';
            document.getElementById('ctbUrl').value = '';
            document.getElementById('ctbVideo').value = '';
        };

        contributeModal.addEventListener('click', e => { if (e.target === contributeModal) window.closeContributeModal(); });

        window.submitContribution = async function () {
            const title = document.getElementById('ctbTitle').value.trim();
            const desc = document.getElementById('ctbDesc').value.trim();
            const tag = document.getElementById('ctbTag').value;
            const url = document.getElementById('ctbUrl').value.trim();
            const video = document.getElementById('ctbVideo').value.trim();
            const status = document.getElementById('ctbStatusMsg');
            const btn = document.getElementById('ctbSubmitBtn');

            if (!title || !tag || !url) {
                status.style.display = 'block';
                status.style.color = '#ff6b6b';
                status.innerText = '⚠️ Vui lòng điền đầy đủ Tiêu đề, Phân loại và Link tài liệu.';
                return;
            }

            btn.disabled = true;
            btn.innerText = 'Đang gửi...';
            status.style.display = 'none';

            try {
                await addDoc(collection(db, 'submissions'), {
                    title, description: desc, category: tag,
                    fileUrl: url, videoUrl: video || null,
                    submitterUid: currentUserUid,
                    status: 'pending',
                    timestamp: serverTimestamp()
                });
                status.style.display = 'block';
                status.style.color = 'var(--neon-cyan)';
                status.innerText = '✅ Đã gửi thành công! Cảm ơn bạn đã đóng góp 💛';
                btn.innerText = 'Đã gửi!';
                setTimeout(() => window.closeContributeModal(), 2500);
            } catch (e) {
                status.style.display = 'block';
                status.style.color = '#ff6b6b';
                status.innerText = '❌ Lỗi: ' + e.message;
                btn.disabled = false;
                btn.innerText = 'Gửi Đóng Góp →';
            }
        };

        // UI Variables (Auth Modal)
        const authModal = document.getElementById('authModal');
        window.authMode = 'login'; // 'login' or 'register'

        window.openAuthModal = function () {
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('authError').style.display = 'none';
        }

        window.closeAuthModal = function () {
            authModal.classList.remove('active');
            document.body.style.overflow = '';
        }

        window.togglePasswordVisibility = function () {
            const pwdInput = document.getElementById('authPassword');
            const eyeOn = document.getElementById('eyeIcon');
            const eyeOff = document.getElementById('eyeOffIcon');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                eyeOn.style.display = 'none';
                eyeOff.style.display = 'block';
            } else {
                pwdInput.type = 'password';
                eyeOn.style.display = 'block';
                eyeOff.style.display = 'none';
            }
        };

        window.switchAuthTab = function (mode) {
            window.authMode = mode;
            const tabs = document.querySelectorAll('.auth-tab');
            tabs[0].classList.toggle('active', mode === 'login');
            tabs[1].classList.toggle('active', mode === 'register');

            document.getElementById('authTitle').innerText = mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản';
            document.getElementById('authSubmitBtn').innerText = mode === 'login' ? 'Đăng nhập' : 'Đăng ký';
            document.getElementById('authError').style.display = 'none';
        }

        window.submitAuth = async function () {
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const errorMsg = document.getElementById('authError');
            const btn = document.getElementById('authSubmitBtn');

            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg> Đang xử lý...';
            errorMsg.style.display = 'none';

            try {
                if (window.authMode === 'login') {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                }
                window.closeAuthModal();
            } catch (error) {
                errorMsg.style.display = 'block';
                // Lọc lỗi sang tiếng Việt cho thân thiện
                let tiengVietMap = {
                    'auth/email-already-in-use': 'Email này đã được sử dụng.',
                    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
                    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
                    'auth/too-many-requests': 'Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau.'
                };
                errorMsg.innerText = tiengVietMap[error.code] || "Lỗi giao tiếp máy chủ: " + error.code;
            } finally {
                btn.innerText = window.authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
            }
        }

        window.signOutAdmin = async function () {
            await signOut(auth);
        }

        // Close modal when clicking outside content
        window.addEventListener('click', (e) => {
            if (e.target === modal) window.closeModal();
            if (e.target === authModal) window.closeAuthModal();
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modal.classList.contains('active')) window.closeModal();
                if (authModal.classList.contains('active')) window.closeAuthModal();
            }
        });

        // Auth State Listener
        window.defaultAuthorDesc = document.getElementById('authorDesc').innerHTML;
        onAuthStateChanged(auth, (user) => {
            const navBtn = document.getElementById('navAuthBtn');
            const uploadBtn = document.getElementById('adminUploadBtn');
            const authorH1 = document.querySelector('.author-info h1');
            const authorDesc = document.getElementById('authorDesc');

            if (user) {
                // Logged in
                currentUserUid = user.uid;
                const isAdmin = user.email === 'vokien609@gmail.com';
                navBtn.innerText = isAdmin ? 'Đăng xuất Admin' : 'Đăng xuất';
                navBtn.onclick = window.signOutAdmin;
                navBtn.style.color = 'var(--neon-cyan)';
                navBtn.style.borderColor = 'var(--neon-cyan)';

                // Description keeps the same as admin's default info
                authorDesc.innerHTML = window.defaultAuthorDesc;

                const displayName = user.email.split('@')[0];
                if (isAdmin) {
                    currentUserRole = 'admin';
                    uploadBtn.style.display = 'flex'; // Hiện nút Upload
                    authorH1.innerHTML = `Chào bạn,<br>Tôi là <span>Bourbon <svg width="24" height="24" style="vertical-align: middle; margin-bottom: 5px;" viewBox="0 0 24 24" fill="var(--neon-cyan)" stroke="var(--neon-cyan)" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`;
                    document.getElementById('contributeNavBtn').style.display = 'none';
                } else {
                    uploadBtn.style.display = 'none';
                    authorH1.innerHTML = `Chào ${displayName} <svg width="24" height="24" style="vertical-align: middle; margin-bottom: 5px;" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 14 0v2"/></svg>,<br>Tôi là <span>Bourbon</span>`;
                    document.getElementById('contributeNavBtn').style.display = 'inline-flex';
                }
                fetchUserLevelAvatar(user.uid);
                fetchTags(); // Reload tags to show private/vault options
            } else {
                // Logged out
                currentUserUid = null;
                currentUserLikedDocs = [];
                currentUserVault = [];
                currentUserRole = 'user';
                navBtn.innerText = 'Đăng nhập / Đăng ký';
                navBtn.onclick = window.openAuthModal;
                navBtn.style.color = '';
                navBtn.style.borderColor = '';

                uploadBtn.style.display = 'none';
                document.getElementById('contributeNavBtn').style.display = 'none';
                authorH1.innerHTML = `Chào bạn,<br>Tôi là <span>Bourbon</span>`;
                authorDesc.innerHTML = window.defaultAuthorDesc;
                fetchAdminGlobalAvatar();
                fetchTags(); // Hide private options
            }
        });

        // Category Data
        let allDocs = [];

        async function fetchTags() {
            try {
                const snap = await getDocs(collection(db, "tags"));
                const catDiv = document.getElementById('homeCategories');
                let html = '<div class="cat-tag active" data-cat="Tất cả" onclick="filterDocs(\'Tất cả\', this)">Tất cả</div>';
                
                if (currentUserUid) {
                    html += '<div class="cat-tag" data-cat="vault" style="color: var(--neon-cyan); border-color: var(--neon-cyan);" onclick="filterDocs(\'vault\', this)">📂 Thư viện của tôi</div>';
                    
                    if (currentUserRole === 'vip' || currentUserRole === 'admin' || currentUserRole === 'contributor') {
                        html += '<div class="cat-tag" data-cat="vip" style="color: #ffcc00; border-color: #ffcc00;" onclick="filterDocs(\'vip\', this)">🌟 VIP Hub</div>';
                    }
                }
                
                // Load additional tags from DB
                snap.forEach(d => {
                    const tagName = d.data().name;
                    if (tagName) {
                        html += `<div class="cat-tag" data-cat="${tagName}" onclick="filterDocs('${tagName}', this)">${tagName}</div>`;
                    }
                });
                
                catDiv.innerHTML = html;
            } catch (e) { console.error("Cannot fetch tags:", e); }
        }

        window.filterDocs = function (category, element) {
            // Update Active Class
            const tags = document.querySelectorAll('#homeCategories .cat-tag');
            tags.forEach(t => t.classList.remove('active'));
            if (element) element.classList.add('active');

            // Render Filtered
            const docGrid = document.getElementById('docGrid');
            let filtered = allDocs;

            // Search Filter Logic
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            if (searchTerm) {
                filtered = filtered.filter(d => 
                    (d.title && d.title.toLowerCase().includes(searchTerm)) ||
                    (d.description && d.description.toLowerCase().includes(searchTerm)) ||
                    (d.category && d.category.toLowerCase().includes(searchTerm))
                );
            }

            if (category === 'Tất cả') {
                // Public docs + VIP docs if user has access
                const hasVipAccess = ['admin', 'vip', 'contributor'].includes(currentUserRole);
                filtered = filtered.filter(d => !d.isVipOnly || hasVipAccess);
            } else if (category === 'vault') {
                filtered = filtered.filter(d => currentUserVault.includes(d.id));
                if (filtered.length === 0 && !searchTerm) {
                    return docGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary);"><p>Thư viện của bạn đang trống.<br>Hãy nhấn nút 📌 trên tài liệu để lưu vào đây!</p></div>`;
                }
            } else if (category === 'vip') {
                filtered = filtered.filter(d => d.isVipOnly);
                if (filtered.length === 0 && !searchTerm) {
                    return docGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary);"><p>Khu vực VIP Hub đang được cập nhật các tài liệu mới...</p></div>`;
                }
            } else {
                filtered = filtered.filter(d => d.category === category);
            }

            if (filtered.length === 0) {
                docGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary);"><p>Không tìm thấy tài liệu phù hợp...</p></div>`;
            } else {
                docGrid.innerHTML = renderDocs(filtered);
            }
        }

        // Add search input listener
        document.getElementById('searchInput').addEventListener('input', () => {
            renderCurrentGrid();
        });

        // Fetch live data directly

        function renderDocs(docsData) {
            let html = '';
            const now = Date.now();

            docsData.forEach((data) => {
                const title = data.title || "Tài liệu không tên";
                const desc = data.description || "Không có mô tả.";
                const date = data.date || data.createdAt || "Vừa xong";
                const iconSVG = data.iconSVG || `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>`;

                // (isNew logic removed per user request)

                html += `
                <div class="doc-card liquid-glass" style="${data.isPinned ? 'border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.15);' : ''}">
                    ${data.isPinned ? '<span class="badge-new" style="background: linear-gradient(135deg, #00f3ff, #b026ff); left: 18px; right: auto;">📌 Đã ghim</span>' : ''}
                    <div class="doc-header">
                        <div class="doc-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${iconSVG}
                            </svg>
                        </div>
                        <div class="doc-title">${title} ${data.isVipOnly ? '<span title="VIP ONLY" style="color:#ffcc00; margin-left:5px;">⭐</span>' : ''}</div>
                    </div>
                    <div class="doc-desc">${desc}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                        <div class="doc-meta" style="gap: 15px;">
                            <div class="meta-item" title="Lượt xem">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                ${data.views || 0}
                            </div>
                            <div class="meta-item" title="Lượt tải xuống">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                ${data.downloads || 0}
                            </div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button title="Lưu vào Thư viện Cá nhân" style="background:none; border:none; cursor:pointer; color: ${currentUserVault.includes(data.id) ? 'var(--neon-cyan)' : 'var(--text-secondary)'}; transition:0.3s;" onclick="toggleVault('${data.id}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${currentUserVault.includes(data.id) ? 'var(--neon-cyan)' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            </button>
                            <button title="Yêu thích" style="background:none; border:none; cursor:pointer; color: ${currentUserLikedDocs.includes(data.id) ? '#ff4d4d' : 'var(--text-secondary)'}; display:flex; align-items:center; gap:5px; font-weight:bold; font-size:16px; transition:0.3s;" onclick="toggleLike('${data.id}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${currentUserLikedDocs.includes(data.id) ? '#ff4d4d' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                ${data.likes || 0}
                            </button>
                        </div>
                    </div>

                    <div class="doc-footer" style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="doc-meta">
                            <div class="meta-item">${date}</div>
                        </div>
                        <button class="btn-view" onclick="openModal('${data.id}')">
                            Xem chi tiết
                        </button>
                    </div>
                </div>
                `;
            });
            return html;
        }

        async function fetchDocuments() {
            const docGrid = document.getElementById('docGrid');

            try {
                // Fetch from Firestore collection "documents"
                const snapshots = await getDocs(collection(db, "documents"));

                if (snapshots.empty) {
                    docGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary);"><p>Chưa có tài liệu nào được chia sẻ trên hệ thống.</p></div>';
                } else {
                    allDocs = [];
                    snapshots.forEach(doc => allDocs.push({ id: doc.id, ...doc.data() }));
                    
                    // Sort: Pinned first, then by timestamp (desc)
                    allDocs.sort((a, b) => {
                        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
                        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                        return timeB - timeA;
                    });

                    docGrid.innerHTML = renderDocs(allDocs);
                    showWelcomePopup(allDocs); // ← Hiện popup sau khi tải xong
                }
            } catch (err) {
                console.error("Firebase connection error.", err);
                docGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--neon-red);"><p>Lỗi kết nối cơ sở dữ liệu. Vui lòng kiểm tra lại quyền truy cập Firestore Rules.</p></div>';
            }
        }

        // ── Welcome Popup Logic ──
        function showWelcomePopup(docs) {
            const today = new Date().toDateString();
            const lastSeen = localStorage.getItem('welcomeLastSeen');
            if (lastSeen === today) return; // Đã xem hôm nay rồi, bỏ qua

            // Đếm tài liệu mới trong 24 giờ qua
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const newCount = docs.filter(d => d.timestamp && d.timestamp.toMillis && d.timestamp.toMillis() > oneDayAgo).length;

            const badge = document.getElementById('welcomeNewBadge');
            const body = document.getElementById('welcomeBody');

            if (newCount > 0) {
                badge.style.display = 'inline-block';
                badge.innerHTML = `🔥 ${newCount} tài liệu mới trong 24 giờ qua!`;
                body.innerHTML = `Hôm nay có <strong style="color:var(--neon-cyan)">${newCount} tài liệu mới</strong> vừa được thêm vào kho.<br>Khám phá ngay và đừng bỏ lỡ nhé! 💛`;
            } else {
                body.innerHTML = `Kho tài nguyên của Bourbon luôn miễn phí và được cập nhật thường xuyên.<br>Nếu thấy hữu ích, hãy cho mình biết nhé! 💛`;
            }

            // Hiện popup sau 800ms delay để trang load xong
            setTimeout(() => {
                document.getElementById('welcomeOverlay').classList.add('active');
            }, 800);
        }

        window.closeWelcome = function () {
            const overlay = document.getElementById('welcomeOverlay');
            overlay.classList.remove('active');
            localStorage.setItem('welcomeLastSeen', new Date().toDateString());
        };

        // Click ra ngoài để đóng
        document.getElementById('welcomeOverlay').addEventListener('click', function (e) {
            if (e.target === this) window.closeWelcome();
        });

        // Initialize fetch
        fetchTags();
        fetchDocuments();
