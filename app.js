/* ==========================================================================
   MediVision AI - Application logic, State Management, and API Integration
   ========================================================================== */

// --- 1. API Configuration & State Management ---
// When deploying to production (e.g. Netlify), set this to your deployed backend URL (e.g., 'https://your-backend.onrender.com')
const PRODUCTION_BACKEND_URL = ''; 

const API_BASE = window.location.origin.includes(':8000') 
    ? '' 
    : (PRODUCTION_BACKEND_URL || 'http://127.0.0.1:8000');

let records = [];
let currentUser = JSON.parse(localStorage.getItem('medivision_user')) || null;

// Application State
const appState = {
    currentView: 'landing', // 'landing' | 'app'
    currentTab: 'tab-upload',
    selectedModality: 'ecg',
    selectedVisionModel: 'vit',
    selectedChatModel: 'biogpt',
    activeContextRecord: null, // Holds record currently being analyzed/discussed
    activeDoctorRecordId: null,
    isScanning: false
};

// Fetch all patient/doctor medical records from FastAPI SQL Database
async function fetchRecords() {
    if (!currentUser) return [];
    try {
        const res = await fetch(`${API_BASE}/api/records?email=${encodeURIComponent(currentUser.email)}&role=${encodeURIComponent(currentUser.role)}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token || ''}`
            }
        });
        if (!res.ok) throw new Error("Failed to fetch records");
        records = await res.json();
        return records;
    } catch (err) {
        console.error("Failed to query SQL database records:", err);
        return [];
    }
}

// --- 2. DOM Elements Mapping ---
const elements = {
    // Navigation
    navLogo: document.getElementById('nav-logo'),
    navLinks: document.querySelectorAll('.nav-links a'),
    btnPatientLoginTrigger: document.getElementById('btn-patient-login-trigger'),
    btnDoctorLoginTrigger: document.getElementById('btn-doctor-login-trigger'),
    btnDashboardTrigger: document.getElementById('btn-dashboard-trigger'),
    btnSignoutTrigger: document.getElementById('btn-signout-trigger'),
    
    // View Sections
    viewLanding: document.getElementById('view-landing'),
    viewApp: document.getElementById('view-app'),
    
    // Sidebar
    sidebarItems: document.querySelectorAll('.sidebar-item'),
    profileName: document.getElementById('profile-name'),
    profileRole: document.getElementById('profile-role'),
    btnLogout: document.getElementById('btn-logout'),
    sidebarDoctorItem: document.getElementById('sidebar-doctor-item'),
    queueBadge: document.getElementById('queue-badge'),
    
    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    btnCloseAuth: document.getElementById('btn-close-auth'),
    signinForm: document.getElementById('signin-form'),
    btnGoogleSignIn: document.getElementById('btn-google-signin'),
    googleAuthModal: document.getElementById('google-auth-modal'),
    googleAccountList: document.getElementById('google-account-list'),
    googleCustomForm: document.getElementById('google-custom-form'),
    btnGoogleBack: document.getElementById('btn-google-back'),
    
    // Diagnostic Center
    modalityButtons: document.querySelectorAll('.modality-btn'),
    selectVisionModel: document.getElementById('select-vision-model'),
    activeVisionModelLabel: document.getElementById('active-vision-model-label'),
    dragDropZone: document.getElementById('drag-drop-zone'),
    fileInput: document.getElementById('file-input'),
    viewerEmpty: document.getElementById('viewer-empty'),
    viewerActive: document.getElementById('viewer-active'),
    scanPreviewImg: document.getElementById('scan-preview-img'),
    scanLaser: document.getElementById('scan-laser'),
    heatmapOverlay: document.getElementById('heatmap-overlay'),
    btnToggleHeatmap: document.getElementById('btn-toggle-heatmap'),
    scanStatusText: document.getElementById('scan-status-text'),
    scanProgressBox: document.getElementById('scan-progress-box'),
    scanProgressLabel: document.getElementById('scan-progress-label'),
    scanProgressPct: document.getElementById('scan-progress-pct'),
    scanProgressFill: document.getElementById('scan-progress-fill'),
    predictionResultsBox: document.getElementById('prediction-results-box'),
    resultStatusBadge: document.getElementById('result-status-badge'),
    resultProbabilityText: document.getElementById('result-probability-text'),
    resultProbabilityFill: document.getElementById('result-probability-fill'),
    resultPathologyName: document.getElementById('result-pathology-name'),
    resultClinicalTags: document.getElementById('result-clinical-tags'),
    btnGotoChat: document.getElementById('btn-goto-chat'),
    
    // Sample triggers
    btnUseSampleEcg: document.getElementById('btn-use-sample-ecg'),
    btnUseSampleXray: document.getElementById('btn-use-sample-xray'),
    btnUseSampleMri: document.getElementById('btn-use-sample-mri'),
    
    // Chatbot Panel
    selectChatbotModel: document.getElementById('select-chatbot-model'),
    chatContextEmpty: document.getElementById('chat-context-empty'),
    chatContextLoaded: document.getElementById('chat-context-loaded'),
    chatContextThumb: document.getElementById('chat-context-thumb'),
    chatContextType: document.getElementById('chat-context-type'),
    chatContextSummary: document.getElementById('chat-context-summary'),
    chatContextTag: document.getElementById('chat-context-tag'),
    chatMessagesContainer: document.getElementById('chat-messages-container'),
    chatForm: document.getElementById('chat-form'),
    chatTextInput: document.getElementById('chat-text-input'),
    chatSuggestionsBox: document.getElementById('chat-suggestions-box'),
    
    // Medical Records History
    recordsTableBody: document.getElementById('records-table-body'),
    
    // Doctor Dashboard
    doctorQueueList: document.getElementById('doctor-queue-list'),
    doctorReviewEmpty: document.getElementById('doctor-review-empty'),
    doctorReviewActive: document.getElementById('doctor-review-active'),
    reviewPatientName: document.getElementById('review-patient-name'),
    reviewRecordId: document.getElementById('review-record-id'),
    reviewAiProbabilityBadge: document.getElementById('review-ai-probability-badge'),
    reviewScanImg: document.getElementById('review-scan-img'),
    reviewModality: document.getElementById('review-modality'),
    reviewAiModel: document.getElementById('review-ai-model'),
    reviewProbability: document.getElementById('review-probability'),
    reviewVerdict: document.getElementById('review-verdict'),
    reviewPathology: document.getElementById('review-pathology'),
    doctorClinicalVerdict: document.getElementById('doctor-clinical-verdict'),
    doctorClinicalNotes: document.getElementById('doctor-clinical-notes'),
    doctorSignature: document.getElementById('doctor-signature'),
    btnSubmitDoctorApproval: document.getElementById('btn-submit-doctor-approval'),
    
    // Printable PDF area
    printableReport: document.getElementById('printable-report')
};

// --- 3. App View & Navigation Controllers ---
function updateNavigationState() {
    const isLogged = !!currentUser;
    if (isLogged) {
        if (elements.btnPatientLoginTrigger) elements.btnPatientLoginTrigger.classList.add('hidden');
        if (elements.btnDoctorLoginTrigger) elements.btnDoctorLoginTrigger.classList.add('hidden');
        if (elements.btnDashboardTrigger) elements.btnDashboardTrigger.classList.remove('hidden');
        if (elements.btnSignoutTrigger) elements.btnSignoutTrigger.classList.remove('hidden');
    } else {
        if (elements.btnPatientLoginTrigger) elements.btnPatientLoginTrigger.classList.remove('hidden');
        if (elements.btnDoctorLoginTrigger) elements.btnDoctorLoginTrigger.classList.remove('hidden');
        if (elements.btnDashboardTrigger) elements.btnDashboardTrigger.classList.add('hidden');
        if (elements.btnSignoutTrigger) elements.btnSignoutTrigger.classList.add('hidden');
    }
}

function switchView(viewName) {
    appState.currentView = viewName;
    
    const mainNavbar = document.querySelector('.navbar');
    
    if (viewName === 'landing') {
        elements.viewLanding.classList.add('active');
        elements.viewApp.classList.remove('active');
        if (mainNavbar) mainNavbar.classList.remove('hidden');
        
        // Update header active links
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        if (elements.navLinks && elements.navLinks.length > 0) {
            elements.navLinks[0].classList.add('active');
        }
    } else if (viewName === 'app') {
        // Enforce Login to open workspace
        if (!currentUser) {
            openAuthModal();
            return;
        }
        elements.viewLanding.classList.remove('active');
        elements.viewApp.classList.add('active');
        if (mainNavbar) mainNavbar.classList.add('hidden');
        
        // Setup user sidebar details
        elements.profileName.textContent = currentUser.name;
        const roleLabels = {
            patient: 'User',
            doctor: 'Specialist'
        };
        elements.profileRole.textContent = `Role: ${roleLabels[currentUser.role] || currentUser.role}`;
        
        if (currentUser.role === 'doctor') {
            elements.sidebarDoctorItem.classList.remove('hidden');
        } else {
            elements.sidebarDoctorItem.classList.add('hidden');
        }
        
        refreshDataViews();
    }
    window.scrollTo(0, 0);
}

function switchTab(tabId) {
    appState.currentTab = tabId;
    
    // Toggle sidebar elements active state
    elements.sidebarItems.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Toggle actual view panels
    document.querySelectorAll('.app-tab-panel').forEach(panel => {
        if (panel.id === tabId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

// Model toggle helper on Landing page
document.querySelectorAll('.model-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.model-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const type = tab.getAttribute('data-model-type');
        document.querySelectorAll('.model-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`model-content-${type}`).classList.add('active');
    });
});

// Setup click selectors for model subcards to simulate configuration
document.querySelectorAll('.model-subcard').forEach(card => {
    card.addEventListener('click', () => {
        const parentGrid = card.parentElement;
        parentGrid.querySelectorAll('.model-subcard').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        const modelId = card.getAttribute('data-model-id');
        const isVision = card.closest('.model-content').id === 'model-content-vision';
        
        if (isVision) {
            appState.selectedVisionModel = modelId;
            elements.selectVisionModel.value = modelId;
            elements.activeVisionModelLabel.textContent = card.querySelector('h5').textContent;
        } else {
            appState.selectedChatModel = modelId;
            elements.selectChatModel.value = modelId;
        }
    });
});

// --- 4. User Authentication Controllers ---
function openAuthModal(defaultRole = 'patient') {
    elements.authModal.classList.add('active');
    
    // Reset modal view states to default (Login)
    const authLoginView = document.getElementById('auth-login-view');
    const authSignupView = document.getElementById('auth-signup-view');
    if (authLoginView && authSignupView) {
        authLoginView.classList.add('active');
        authSignupView.classList.remove('active');
    }
    
    const tabPatient = document.getElementById('tab-login-patient');
    const tabDoctor = document.getElementById('tab-login-doctor');
    const signinRoleInput = document.getElementById('signin-role');
    const loginSubtitle = document.getElementById('login-subtitle');
    const signinEmailInput = document.getElementById('signin-email');
    
    if (tabPatient && tabDoctor) {
        if (defaultRole === 'doctor') {
            tabDoctor.classList.add('active');
            tabPatient.classList.remove('active');
            if (signinRoleInput) signinRoleInput.value = 'doctor';
            if (loginSubtitle) loginSubtitle.textContent = 'Login to access your specialist dashboard';
            if (signinEmailInput) {
                signinEmailInput.placeholder = 'enter your specialist email address';
                signinEmailInput.value = '';
            }
        } else {
            tabPatient.classList.add('active');
            tabDoctor.classList.remove('active');
            if (signinRoleInput) signinRoleInput.value = 'patient';
            if (loginSubtitle) loginSubtitle.textContent = 'Login to access your patient dashboard';
            if (signinEmailInput) {
                signinEmailInput.placeholder = 'enter your patient email address';
                signinEmailInput.value = '';
            }
        }
    }
    
    const signinPasswordInput = document.getElementById('signin-password');
    if (signinPasswordInput) signinPasswordInput.value = '';
}

function closeAuthModal() {
    elements.authModal.classList.remove('active');
}

function handleLogin(email, role = 'patient', customName = '', token = '') {
    let name = customName;
    if (!name) {
        name = role === 'doctor' ? 'Dr. Sarah Jenkins, MD' : 'David Miller';
    }
    
    currentUser = {
        email: email,
        role: role,
        name: name,
        token: token
    };
    
    localStorage.setItem('medivision_user', JSON.stringify(currentUser));
    updateNavigationState();
    closeAuthModal();
    switchView('app');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('medivision_user');
    updateNavigationState();
    switchView('landing');
}

// --- 5. Diagnostic scanning & AI predictions ---

// local backup dictionary of recommendations used in the printable report
const CHATBOT_RESPONSES = {
    ecg: {
        abnormal: {
            intro: "I see your ECG diagnostic results show a high probability of anomalies (94.8% probability) pointing to a potential Arrhythmia or Premature Ventricular Contractions (PVCs). I can explain these findings or provide lifestyle precautions.",
            whatItShows: "• Wider-than-average QRS complex spikes on the rhythm strip.<br>• Ectopic beats firing prematurely before the normal SA node cycle.<br>• Short periods of tachycardic bursts in Lead II.",
            whatItMeans: "The heart's electrical system is experiencing localized conductivity instability. Beats are initiated in the ventricles instead of the sinoatrial node, causing cardiac cycles to fall out of rhythmic synchrony.",
            alternativeRecommendations: "• <strong>Electrolyte Balance:</strong> Consume magnesium and potassium-dense foods (e.g., avocados, cooked spinach, Swiss chard) to support electrical membrane stability.<br>• <strong>Vagal Activation:</strong> Practice slow diaphragmatic breathing (inhale 5 seconds, exhale 7 seconds) and use cool face compresses to stimulate the vagus nerve, helping to lower heart rate and reduce ectopic events.<br>• <strong>CoQ10 Integration:</strong> Supplement with 100-200mg of Coenzyme Q10 daily (subject to specialist sign-off) to improve cellular ATP bioenergetics within the cardiac tissue.<br>• <strong>Mitigate Sympathetic Tone:</strong> Strictly eliminate synthetic energy drinks, excess coffee, and sleep-depriving habits. Shift to calming teas like chamomile to reduce adrenaline spikes.",
            symptoms: "Arrhythmia symptoms commonly include palpitations (a fluttering or racing heart), mild chest discomfort, shortness of breath, lightheadedness, or fatigue during exertion.",
            precautions: "Given the high probability (94.8%) of ventricular anomalies on your ECG, please take these precautions: \n1. **Avoid Stimulants:** Strictly limit caffeine, alcohol, and nicotine.\n2. **Avoid Intrusive Workouts:** Refrain from heavy weight lifting or running until cleared by a specialist.\n3. **Monitor Vitals:** Check your resting pulse daily.\n4. **Specialist Referral:** This result has been routed to our clinical desk. We advise booking a diagnostic consultation."
        },
        normal: {
            intro: "Your ECG scan shows a 7.2% probability of anomaly, indicating a healthy normal sinus rhythm. Your heart's electrical pathways are firing correctly.",
            whatItShows: "• A regular heart rate between 60-100 BPM.<br>• Symmetrical P waves preceding every standard QRS complex.<br>• Constant and regular PR intervals.",
            whatItMeans: "Your heart is contracting via a healthy sinus rhythm, demonstrating optimal electrical conductivity without signs of ectopic signals.",
            alternativeRecommendations: "• <strong>Cardio Preservation:</strong> Perform 30 minutes of low-intensity aerobic conditioning (like walking, cycling) 5 days a week to support stroke volume and lower resting pressure.<br>• <strong>Vessel Elasticity:</strong> Include healthy monounsaturated fats (extra virgin olive oil, walnuts) to keep arteries highly flexible.<br>• <strong>Hydration Maintenance:</strong> Stay hydrated with clean water and coconut water to prevent transient electrolyte fluctuation.",
            symptoms: "A normal sinus rhythm means you shouldn't feel irregular fluttering. If you still experience chest pains or palpitations, please report them directly to a medical specialist, as non-electrical conditions could be present.",
            precautions: "Keep up the excellent work! To support your cardiovascular health: exercise moderately 150 mins per week, maintain a diet low in trans fats, and limit high sodium inputs."
        }
    },
    xray: {
        abnormal: {
            intro: "Your Chest X-Ray scan shows signs of Cardiomegaly (an enlarged heart) with an AI risk confidence of 84.2%. This means the width of your heart exceeds 50% of the interior chest diameter.",
            whatItShows: "• Enlargement of the cardiac silhouette shape, exceeding 0.50 of the ribcage width.<br>• Moderate elevation of diaphragm lines.<br>• Minor pleural margins congestion.",
            whatItMeans: "The heart muscle is working under chronically elevated workload, leading to hypertrophy (enlargement) of the ventricles, often caused by untreated high blood pressure or valve issues.",
            alternativeRecommendations: "• <strong>Strict Sodium Limitation:</strong> Limit sodium to under 1,500 mg daily to decrease fluid retention, vascular volume, and diastolic pressure.<br>• <strong>Natural Vasodilators:</strong> Incorporate organic beetroot juice (rich in dietary nitrates) or garlic extract to naturally relax blood vessels and reduce heart workload.<br>• <strong>Anti-Gravity Sleeping:</strong> Elevate the head of your bed by 15-30 degrees using a wedge pillow to prevent nocturnal fluid accumulation in the chest, easing breathing.<br>• <strong>Hawthorn Berry Cardiotonic:</strong> Research traditional cardiotonic herbs like Hawthorn Berry to naturally support vascular blood flow and coronary circulation.",
            symptoms: "An enlarged heart (cardiomegaly) may cause fluid build-up in the lungs, leading to shortness of breath (especially when lying flat), cough, leg swelling (edema), and fatigue.",
            precautions: "For suspected Cardiomegaly:\n1. **Restrict Fluid & Sodium:** High salt intake increases blood volume, putting extra strain on the heart muscle.\n2. **Avoid Heavy Exertion:** Avoid activities that trigger immediate shortness of breath.\n3. **Sleep Elevated:** Use extra pillows to help breathing at night.\n4. **Consultation:** Please review these X-ray margins with a specialist for an echocardiogram referral."
        },
        normal: {
            intro: "Your Chest X-Ray indicates a low anomaly rate (11.5%). The size of your cardiac silhouette is normal, and your lung fields are clear.",
            whatItShows: "• A cardiothoracic ratio of less than 0.50.<br>• Clear, dark lung fields free of fluid consolidation.<br>• Unremarkable pleural space lines.",
            whatItMeans: "Your lungs are fully aerated, and your heart size is within normal anatomical standards, meaning there is no current evidence of chronic dilation or congestion.",
            alternativeRecommendations: "• <strong>Lung Volume Exercises:</strong> Practice deep box breathing (4s inhale, 4s hold, 4s exhale, 4s hold) to maximize alveolar oxygenation.<br>• <strong>Anti-inflammatory Diet:</strong> Eat foods high in antioxidants (berries, green tea) to safeguard pulmonary and vascular tissues.",
            symptoms: "Lungs and heart size are within normal anatomical parameters.",
            precautions: "Maintain a healthy lifestyle by practicing aerobic exercise, staying hydrated, and avoiding smoke exposure."
        }
    },
    mri: {
        abnormal: {
            intro: "Your Cardiac MRI shows a 79.5% probability of anomalous tissue patterns, signifying potential myocardial infarction (tissue scarring or heart muscle injury).",
            whatItShows: "• Reduced contraction movement (hypokinesis) in the ventricular wall segments.<br>• Elevated signal intensity indicating structural scar tissue or localized fibrosis.<br>• Compensatory changes in surrounding healthy wall areas.",
            whatItMeans: "A region of the heart muscle suffered oxygen starvation in the past, leading to localized tissue necrosis (scarring) and reducing the overall pumping efficiency of the left ventricle.",
            alternativeRecommendations: "• <strong>High-Dose Omega-3s:</strong> Supplement with 2-3g of high-quality fish oil (EPA/DHA) daily to alleviate chronic cardiovascular inflammation and protect cell membrane structures.<br>• <strong>Mediterranean Lifestyle:</strong> Rely on a diet rich in raw nuts, legumes, fresh vegetables, and fatty fish to lower secondary event rates.<br>• <strong>Structured Cardiovascular Rehab:</strong> Join a local cardiac rehabilitation program to complete supervised, heart-rate-limited conditioning to slowly rebuild stroke volume.<br>• <strong>Antioxidant Protection:</strong> Take grape seed extract or consume polyphenols to prevent oxidative stress in recovering heart tissues.",
            symptoms: "Myocardial ischemia or infarction risks are marked by pressure/squeezing in the center of the chest, pain spreading to the left arm or jaw, cold sweats, and nausea.",
            precautions: "For suspected myocardial injury:\n1. **Zero Stress:** Rest immediately; avoid elevating your heart rate.\n2. **Emergency Preparedness:** If you experience active chest pressure lasting over 5 minutes, seek emergency medical services immediately.\n3. **Follow-Up:** A cardiac MRI finding of localized akinetic walls requires a specialist's assessment for coronary artery clearance."
        },
        normal: {
            intro: "Your Cardiac MRI confirms normal ventricular operations with a low 5.6% anomaly rating. Left ventricle wall thickness and ejection fraction are optimal.",
            whatItShows: "• Left ventricular ejection fraction (LVEF) between 55% - 65%.<br>• Fully synchronous wall motion across all ventricles.<br>• Normal myocardial tissue density without scar signals.",
            whatItMeans: "Your heart muscle is healthy, with standard thickness and optimal blood pump capacity, showing no evidence of previous heart attacks or dilated cardiomyopathy.",
            alternativeRecommendations: "• <strong>Nitric Oxide Optimization:</strong> Consume pumpkin seeds and walnuts to support endothelial health and blood vessel dilation.<br>• <strong>Interval Training:</strong> Engage in moderate interval training once a week (if cleared) to optimize maximal stroke volume and aerobic thresholds.",
            symptoms: "No tissue defects or ventricular blockages were localized.",
            precautions: "Continue a heart-healthy Mediterranean diet, perform routine aerobic exercises, and track your lipid panels annually."
        }
    }
};

async function triggerDiagnosticScan(file, isSample = false) {
    if (appState.isScanning) return;
    
    appState.isScanning = true;
    elements.viewerEmpty.classList.add('hidden');
    elements.viewerActive.classList.remove('hidden');
    
    // Set immediate preview URL
    const previewUrl = URL.createObjectURL(file);
    elements.scanPreviewImg.src = previewUrl;
    elements.scanLaser.classList.add('active');
    elements.heatmapOverlay.classList.add('hidden');
    elements.btnToggleHeatmap.setAttribute('disabled', 'true');
    
    elements.scanProgressBox.classList.remove('hidden');
    elements.predictionResultsBox.classList.add('hidden');
    
    // Start progress animation
    let progress = 0;
    let scanFinished = false;
    let apiResponse = null;
    let apiError = null;

    const progressInterval = setInterval(() => {
        progress += 4;
        if (progress > 100) progress = 100;
        
        elements.scanProgressPct.textContent = `${progress}%`;
        elements.scanProgressFill.style.width = `${progress}%`;
        
        if (progress < 30) {
            elements.scanProgressLabel.textContent = 'Loading tensor weight configurations...';
        } else if (progress < 60) {
            elements.scanProgressLabel.textContent = 'Extracting spatial medical anomalies...';
        } else if (progress < 85) {
            elements.scanProgressLabel.textContent = 'Executing convolutional token layers...';
        } else {
            elements.scanProgressLabel.textContent = 'Generating Vision attention matrix maps...';
        }
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            scanFinished = true;
            checkAndFinalize();
        }
    }, 100);

    // Call predict API in parallel
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modality', appState.selectedModality.toUpperCase() + (appState.selectedModality === 'ecg' ? '' : ' Scan'));
    formData.append('model_used', elements.selectVisionModel.options[elements.selectVisionModel.selectedIndex].text.split(' ')[0]);
    formData.append('patient_name', currentUser.name);
    formData.append('patient_email', currentUser.email);

    try {
        const res = await fetch(`${API_BASE}/api/predict`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token || ''}`
            },
            body: formData
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Evaluation failed.');
        }
        apiResponse = await res.json();
    } catch (err) {
        console.error(err);
        apiError = err.message || 'Server connection error.';
    } finally {
        checkAndFinalize();
    }

    function checkAndFinalize() {
        if (scanFinished && (apiResponse || apiError)) {
            appState.isScanning = false;
            elements.scanLaser.classList.remove('active');
            elements.scanProgressBox.classList.add('hidden');
            
            if (apiError) {
                alert(`AI Evaluation Failed: ${apiError}`);
                elements.viewerEmpty.classList.remove('hidden');
                elements.viewerActive.classList.add('hidden');
                return;
            }
            
            // finalize scan result using backend response
            finalizeScanResult(apiResponse);
        }
    }
}

function finalizeScanResult(record) {
    // Update labels from real record
    const probPct = parseFloat(record.probability);
    
    elements.resultStatusBadge.textContent = record.verdict;
    elements.resultStatusBadge.className = 'status-badge ' + (record.verdict === 'Normal' ? 'normal-status' : 'critical');
    
    elements.resultProbabilityText.textContent = record.probability;
    elements.resultProbabilityFill.style.width = record.probability;
    
    elements.resultProbabilityFill.className = 'probability-bar-fill';
    if (probPct < 20) {
        elements.resultProbabilityFill.classList.add('normal-fill');
    } else if (probPct < 60) {
        elements.resultProbabilityFill.classList.add('warning-fill');
    } else {
        elements.resultProbabilityFill.classList.add('danger-fill');
    }
    
    elements.resultPathologyName.textContent = record.pathology;
    elements.resultClinicalTags.textContent = record.signatures;
    
    elements.btnToggleHeatmap.removeAttribute('disabled');
    elements.predictionResultsBox.classList.remove('hidden');
    
    // Set active chatbot/report context
    appState.activeContextRecord = record;
    
    // Load context in Chatbot sidebar
    loadChatbotContext(record);
    
    // Refresh table and doctor queues
    refreshDataViews();
}

// --- 6. Chatbot Engine Integration ---
function loadChatbotContext(record) {
    elements.chatContextEmpty.classList.add('hidden');
    elements.chatContextLoaded.classList.remove('hidden');
    
    elements.chatContextThumb.src = `${API_BASE}/${record.scanUrl}`;
    elements.chatContextType.textContent = record.modality;
    elements.chatContextSummary.textContent = `Disease Prob: ${record.probability}`;
    
    elements.chatContextTag.textContent = record.verdict;
    elements.chatContextTag.className = 'badge ' + (record.verdict === 'Normal' ? 'badge-cyan' : 'badge-accent');
    
    // Add bot message describing the context
    const modalityKey = record.modality.toLowerCase().includes('x-ray') ? 'xray' : (record.modality.toLowerCase().includes('mri') ? 'mri' : 'ecg');
    const verdictKey = record.verdict.toLowerCase();
    const profile = CHATBOT_RESPONSES[modalityKey][verdictKey];
    
    const contextMsg = `🚨 <strong>New Diagnostic Scan Loaded (${record.modality})</strong><br><br>` +
                       `🔍 <strong>What this Scan Shows:</strong><br>${profile.whatItShows}<br><br>` +
                       `💡 <strong>What this Information Means:</strong><br>${profile.whatItMeans}<br><br>` +
                       `🌿 <strong>Alternative Health-Improving Recommendations:</strong><br>${profile.alternativeRecommendations}`;
    
    appendChatMessage('bot', contextMsg);
}

function appendChatMessage(sender, text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    
    const icon = sender === 'bot' ? 'bot' : 'user';
    
    msgDiv.innerHTML = `
        <div class="message-avatar"><i data-lucide="${icon}"></i></div>
        <div class="message-bubble">
            <p>${text.replace(/\n/g, '<br>')}</p>
            <span class="timestamp">${time}</span>
        </div>
    `;
    
    elements.chatMessagesContainer.appendChild(msgDiv);
    elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    lucide.createIcons();
}

async function processChatInput(userInput) {
    appendChatMessage('user', userInput);
    
    // Simple response spinner simulation
    const spinnerDiv = document.createElement('div');
    spinnerDiv.className = 'chat-message bot temp-spinner';
    spinnerDiv.innerHTML = `
        <div class="message-avatar"><i data-lucide="bot"></i></div>
        <div class="message-bubble">
            <p>Processing query via ${elements.selectChatbotModel.value}...</p>
        </div>
    `;
    elements.chatMessagesContainer.appendChild(spinnerDiv);
    elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    lucide.createIcons();
    
    try {
        const recordId = appState.activeContextRecord ? appState.activeContextRecord.id : null;
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userInput, recordId })
        });
        
        // Remove temp spinner
        const spinner = elements.chatMessagesContainer.querySelector('.temp-spinner');
        if (spinner) spinner.remove();

        if (!res.ok) {
            appendChatMessage('bot', "Sorry, I encountered an error communicating with the clinic server.");
            return;
        }
        const data = await res.json();
        appendChatMessage('bot', data.response);
    } catch (err) {
        console.error(err);
        const spinner = elements.chatMessagesContainer.querySelector('.temp-spinner');
        if (spinner) spinner.remove();
        appendChatMessage('bot', "Network error. Please make sure the backend server is running.");
    }
}

// --- 7. UI Table and Queue Refresh Loops ---
async function refreshDataViews() {
    await fetchRecords();
    refreshHistoryTable();
    refreshDoctorPortal();
}

function refreshHistoryTable() {
    elements.recordsTableBody.innerHTML = '';
    
    // Filter records for the logged-in patient, or display all if doctor
    const filteredRecords = currentUser.role === 'doctor' 
        ? records 
        : records.filter(r => r.patientEmail === currentUser.email);
        
    if (filteredRecords.length === 0) {
        elements.recordsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">No diagnostic records found. Upload a scan in the Diagnostic Center.</td>
            </tr>
        `;
        return;
    }
    
    filteredRecords.forEach(r => {
        const tr = document.createElement('tr');
        
        let statusClass = 'pending';
        let statusLabel = 'Pending Review';
        if (r.status === 'Approved') {
            statusClass = 'normal-status';
            statusLabel = 'Doctor Approved';
        } else if (r.status === 'Rejected') {
            statusClass = 'critical';
            statusLabel = 'Overruled';
        }
        
        let actionBtn = `
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="triggerReportDownload('${r.id}')"><i data-lucide="download"></i> Report</button>
                <button class="btn btn-primary btn-sm" onclick="selectRecordForChat('${r.id}')"><i data-lucide="message-square"></i> Chat</button>
            </div>
        `;
        
        tr.innerHTML = `
            <td>${r.date}</td>
            <td><strong>${r.id}</strong></td>
            <td>${r.modality}</td>
            <td><code>${r.modelUsed}</code></td>
            <td><span class="status-badge ${r.verdict === 'Normal' ? 'normal-status' : 'critical'}">${r.probability} (${r.verdict})</span></td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td><span class="text-muted">${r.doctorSigned || 'Awaiting Sign-off'}</span></td>
            <td>${actionBtn}</td>
        `;
        
        elements.recordsTableBody.appendChild(tr);
    });
    
    lucide.createIcons();
}

window.selectRecordForChat = function(recordId) {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    appState.activeContextRecord = record;
    loadChatbotContext(record);
    switchTab('tab-chatbot');
};

function refreshDoctorPortal() {
    if (currentUser.role !== 'doctor') return;
    
    elements.doctorQueueList.innerHTML = '';
    const pending = records.filter(r => r.status === 'Pending Review');
    
    // Update sidebar badge
    elements.queueBadge.textContent = pending.length;
    
    if (pending.length === 0) {
        elements.doctorQueueList.innerHTML = '<div class="empty-queue-text text-muted">No reports currently in the validation queue.</div>';
        elements.doctorReviewEmpty.classList.remove('hidden');
        elements.doctorReviewActive.classList.add('hidden');
        appState.activeDoctorRecordId = null;
        return;
    }
    
    pending.forEach(r => {
        const item = document.createElement('div');
        item.className = `queue-item ${appState.activeDoctorRecordId === r.id ? 'active' : ''}`;
        item.setAttribute('data-id', r.id);
        
        item.innerHTML = `
            <div class="queue-item-header">
                <span class="patient-name">${r.patientName}</span>
                <span class="timestamp">${r.date.split(' ')[1]}</span>
            </div>
            <div class="queue-item-details">
                <span>${r.modality}</span>
                <span class="text-warning">${r.probability} Risk</span>
            </div>
        `;
        
        item.addEventListener('click', () => {
            loadRecordForDoctorReview(r.id);
        });
        
        elements.doctorQueueList.appendChild(item);
    });
    
    // Keep active review loaded if still pending, otherwise load first
    if (appState.activeDoctorRecordId) {
        const exists = pending.find(r => r.id === appState.activeDoctorRecordId);
        if (!exists) {
            loadRecordForDoctorReview(pending[0].id);
        } else {
            // Re-highlight
            const activeNode = elements.doctorQueueList.querySelector(`[data-id="${appState.activeDoctorRecordId}"]`);
            if (activeNode) activeNode.classList.add('active');
        }
    } else {
        loadRecordForDoctorReview(pending[0].id);
    }
}

function loadRecordForDoctorReview(recordId) {
    appState.activeDoctorRecordId = recordId;
    
    // Highlight active in list
    elements.doctorQueueList.querySelectorAll('.queue-item').forEach(node => {
        if (node.getAttribute('data-id') === recordId) {
            node.classList.add('active');
        } else {
            node.classList.remove('active');
        }
    });
    
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    elements.doctorReviewEmpty.classList.add('hidden');
    elements.doctorReviewActive.classList.remove('hidden');
    
    elements.reviewPatientName.textContent = record.patientName;
    elements.reviewRecordId.textContent = `Record ID: ${record.id}`;
    
    elements.reviewAiProbabilityBadge.textContent = `${record.probability} AI Risk`;
    elements.reviewAiProbabilityBadge.className = 'status-badge ' + (record.verdict === 'Normal' ? 'normal-status' : 'critical');
    
    elements.reviewScanImg.src = `${API_BASE}/${record.scanUrl}`;
    elements.reviewModality.textContent = record.modality;
    elements.reviewAiModel.textContent = record.modelUsed;
    elements.reviewProbability.textContent = record.probability;
    elements.reviewVerdict.textContent = record.verdict;
    elements.reviewPathology.textContent = record.pathology;
    
    // Pre-fill signature form
    elements.doctorClinicalVerdict.value = record.verdict === 'Normal' ? 'Confirmed - Normal' : 'Confirmed - Abnormal';
    elements.doctorClinicalNotes.value = "";
    elements.doctorSignature.value = currentUser.name;
}

// --- 8. Print Medical PDF Report Generator ---
window.triggerReportDownload = function(recordId) {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    const printContainer = elements.printableReport;
    
    const modalityKey = record.modality.toLowerCase().includes('x-ray') ? 'xray' : (record.modality.toLowerCase().includes('mri') ? 'mri' : 'ecg');
    const verdictKey = record.verdict.toLowerCase();
    const profile = CHATBOT_RESPONSES[modalityKey][verdictKey];
    
    let docSignatureText = record.doctorSigned 
        ? `<p><strong>Authorized Sign-off:</strong> ${record.doctorSigned}</p>`
        : `<p class="text-warning"><strong>Review Status:</strong> Awaiting Clinical Review Validation</p>`;
        
    let docVerdictSection = record.doctorVerdict
        ? `<div class="print-notes-section">
                <h4>Clinical Specialist Validation</h4>
                <p><strong>Verdict:</strong> ${record.doctorVerdict}</p>
                <p><strong>Clinical Notes:</strong> ${record.doctorNotes || 'No notes added.'}</p>
           </div>`
        : `<div class="print-notes-section">
                <h4>Clinical Specialist Validation</h4>
                <p><em>This report was automatically compiled by the MediVision AI neural diagnostic pipeline. Official specialist notes and physical clinician verification signature are pending.</em></p>
           </div>`;

    printContainer.innerHTML = `
        <div class="clinical-report-sheet">
            <div class="print-header">
                <div class="print-logo-box">
                    <h2>MediVision AI Diagnostics</h2>
                </div>
                <div class="print-institution">
                    <p>Cardiology AI Laboratory Sandbox</p>
                    <p>HIPAA Protocol: ID-SANDBOX-2026</p>
                    <p>Date Generated: ${record.date}</p>
                </div>
            </div>
            
            <h3 class="print-title">Electrocardiogram & Imaging Diagnostic Evaluation</h3>
            
            <div class="print-meta-grid">
                <div class="print-meta-item"><strong>User Name:</strong> ${record.patientName}</div>
                <div class="print-meta-item"><strong>User Email:</strong> ${record.patientEmail}</div>
                <div class="print-meta-item"><strong>Record File ID:</strong> ${record.id}</div>
                <div class="print-meta-item"><strong>Scan Modality:</strong> ${record.modality}</div>
                <div class="print-meta-item"><strong>Inference Neural Framework:</strong> ${record.modelUsed}</div>
                <div class="print-meta-item"><strong>Regulatory Clearance:</strong> FDA Preliminary Sandbox</div>
            </div>
            
            <div class="print-diagnostics-section">
                <div class="print-image-panel">
                    <img src="${API_BASE}/${record.scanUrl}" alt="Scan File">
                    <span class="print-image-label">Fig 1. Multi-modal scan input</span>
                </div>
                <div class="print-summary-panel">
                    <h4>Diagnostic Prediction Summary</h4>
                    <span class="print-status-pill">${record.verdict} / High Risk</span>
                    <ul class="print-metrics-list">
                        <li><strong>Anomaly Probability:</strong> ${record.probability}</li>
                        <li><strong>Identified Pathology:</strong> ${record.pathology}</li>
                        <li><strong>Clinical Signature:</strong> ${record.signatures}</li>
                    </ul>
                </div>
            </div>
            
            <div class="print-notes-section" style="margin-top: 20px; page-break-inside: avoid;">
                <h4 style="border-bottom: 1px solid #000000; padding-bottom: 6px; color: #000000 !important; margin-bottom: 10px;">Alternative Health-Improving Guidelines</h4>
                <div style="font-size: 0.9rem; line-height: 1.5; color: #222222;">
                    ${profile.alternativeRecommendations}
                </div>
            </div>
            
            ${docVerdictSection}
            
            <div class="print-signatures">
                <div class="signature-slot">
                    <div class="signature-line"></div>
                    <div class="signature-label">User Acknowledgement</div>
                </div>
                <div class="signature-slot">
                    <div class="signature-line">${record.doctorSigned ? `<span style="font-family: 'Outfit'; font-style: italic; font-weight: 500;">${record.doctorSigned}</span>` : ''}</div>
                    <div class="signature-label">Authorized Specialist Signature</div>
                </div>
            </div>
        </div>
    `;
    
    // Wait for DOM to register and launch print
    setTimeout(() => {
        window.print();
    }, 250);
};

// --- 8.5. Landing Page Animations ---
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        if (isNaN(target)) return;
        const duration = 1200; // count duration in ms
        const stepTime = Math.max(Math.floor(duration / target), 15);
        let current = 0;
        
        counter.textContent = "0";
        
        const timer = setInterval(() => {
            if (target > 30) {
                current += Math.ceil(target / 30);
            } else {
                current += 1;
            }
            
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = current;
            }
        }, stepTime);
    });
}

function initCountersObserver() {
    const statsBar = document.querySelector('.stats-bar');
    if (!statsBar) {
        animateCounters();
        return;
    }
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    obs.disconnect();
                }
            });
        }, { threshold: 0.1 });
        observer.observe(statsBar);
    } else {
        animateCounters();
    }
}

// --- 9. Event Listeners Registry ---
function registerEventListeners() {
    // Top Navbar Navigation links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const target = link.getAttribute('href');
            switchView('landing');
            
            setTimeout(() => {
                const el = document.querySelector(target);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });
    });
    
    elements.navLogo.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('landing');
    });

    // Auth trigger buttons
    if (elements.btnPatientLoginTrigger) {
        elements.btnPatientLoginTrigger.addEventListener('click', () => openAuthModal('patient'));
    }
    if (elements.btnDoctorLoginTrigger) {
        elements.btnDoctorLoginTrigger.addEventListener('click', () => openAuthModal('doctor'));
    }
    if (elements.btnDashboardTrigger) {
        elements.btnDashboardTrigger.addEventListener('click', () => switchView('app'));
    }
    if (elements.btnSignoutTrigger) {
        elements.btnSignoutTrigger.addEventListener('click', handleLogout);
    }
    
    // Pricing page shortcuts
    document.querySelectorAll('.btn-login-p-shortcut').forEach(btn => {
        btn.addEventListener('click', () => openAuthModal('patient'));
    });
    document.querySelectorAll('.btn-login-d-shortcut').forEach(btn => {
        btn.addEventListener('click', () => openAuthModal('doctor'));
    });

    // Auth modal controls
    elements.btnCloseAuth.addEventListener('click', closeAuthModal);
    
    elements.btnLogout.addEventListener('click', handleLogout);
    
    // Switch between Patient and Doctor tabs in Signin modal
    const tabPatient = document.getElementById('tab-login-patient');
    const tabDoctor = document.getElementById('tab-login-doctor');
    const signinRoleInput = document.getElementById('signin-role');
    const loginSubtitle = document.getElementById('login-subtitle');
    const signinEmailInput = document.getElementById('signin-email');

    if (tabPatient && tabDoctor) {
        tabPatient.addEventListener('click', () => {
            tabPatient.classList.add('active');
            tabDoctor.classList.remove('active');
            signinRoleInput.value = 'patient';
            loginSubtitle.textContent = 'Login to access your patient dashboard';
            signinEmailInput.placeholder = 'enter your patient email address';
        });

        tabDoctor.addEventListener('click', () => {
            tabDoctor.classList.add('active');
            tabPatient.classList.remove('active');
            signinRoleInput.value = 'doctor';
            loginSubtitle.textContent = 'Login to access your specialist dashboard';
            signinEmailInput.placeholder = 'enter your specialist email address';
        });
    }

    // Switch between Login and Signup views inside modal
    const linkShowSignup = document.getElementById('link-show-signup');
    const authLoginView = document.getElementById('auth-login-view');
    const authSignupView = document.getElementById('auth-signup-view');

    // Switch between Patient and Doctor tabs in register view
    const tabRegPatient = document.getElementById('tab-register-patient');
    const tabRegDoctor = document.getElementById('tab-register-doctor');
    const signupPatientForm = document.getElementById('signup-patient-form');
    const signupDoctorForm = document.getElementById('signup-doctor-form');
    const signupTitle = document.getElementById('signup-title');
    const signupSubtitle = document.getElementById('signup-subtitle');

    if (tabRegPatient && tabRegDoctor && signupPatientForm && signupDoctorForm) {
        tabRegPatient.addEventListener('click', () => {
            tabRegPatient.classList.add('active');
            tabRegDoctor.classList.remove('active');
            signupPatientForm.classList.add('active');
            signupDoctorForm.classList.remove('active');
            if (signupTitle) signupTitle.textContent = 'Create Patient Account';
            if (signupSubtitle) signupSubtitle.textContent = 'Sign up to access your patient dashboard';
        });

        tabRegDoctor.addEventListener('click', () => {
            tabRegDoctor.classList.add('active');
            tabRegPatient.classList.remove('active');
            signupDoctorForm.classList.add('active');
            signupPatientForm.classList.remove('active');
            if (signupTitle) signupTitle.textContent = 'Create Specialist Account';
            if (signupSubtitle) signupSubtitle.textContent = 'Sign up to access your specialist dashboard';
        });
    }

    if (linkShowSignup && authLoginView && authSignupView) {
        linkShowSignup.addEventListener('click', (e) => {
            e.preventDefault();
            authLoginView.classList.remove('active');
            authSignupView.classList.add('active');
            if (tabRegPatient) tabRegPatient.click();
        });
    }

    // Sign In back-links inside register view
    const linkShowSigninPatient = document.getElementById('link-show-signin-patient');
    const linkShowSigninDoctor = document.getElementById('link-show-signin-doctor');
    if (linkShowSigninPatient && authLoginView && authSignupView) {
        linkShowSigninPatient.addEventListener('click', (e) => {
            e.preventDefault();
            authSignupView.classList.remove('active');
            authLoginView.classList.add('active');
            openAuthModal('patient');
        });
    }
    if (linkShowSigninDoctor && authLoginView && authSignupView) {
        linkShowSigninDoctor.addEventListener('click', (e) => {
            e.preventDefault();
            authSignupView.classList.remove('active');
            authLoginView.classList.add('active');
            openAuthModal('doctor');
        });
    }

    // Sign In Submission
    elements.signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        const roleSelected = signinRoleInput.value;
        
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) {
                const errData = await res.json();
                alert(errData.detail || 'Invalid email or password.');
                return;
            }
            const userData = await res.json();
            
            // Separation validation: Patient vs Doctor
            if (roleSelected === 'doctor' && userData.user.role !== 'doctor') {
                alert("This account is registered as a Patient. Please use the Patient Login tab.");
                return;
            }
            if (roleSelected === 'patient' && userData.user.role === 'doctor') {
                alert("This account is registered as a Specialist. Please use the Specialist Login tab.");
                return;
            }
            
            handleLogin(userData.user.email, userData.user.role, userData.user.name, userData.token);
        } catch (err) {
            console.error(err);
            alert('Server connection error. Please make sure the backend is running.');
        }
    });

    // Patient Sign Up Submission
    if (signupPatientForm) {
        signupPatientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-patient-name').value.trim();
            const email = document.getElementById('signup-patient-email').value.trim();
            const mobile = document.getElementById('signup-patient-mobile').value.trim();
            const password = document.getElementById('signup-patient-password').value;
            const confirmPassword = document.getElementById('signup-patient-confirm').value;
            
            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }
            
            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name, 
                        email, 
                        password, 
                        role: 'patient',
                        mobile
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.detail || 'Registration failed.');
                    return;
                }
                const userData = await res.json();
                alert("Patient registration successful!");
                
                handleLogin(userData.user.email, userData.user.role, userData.user.name, userData.token);
            } catch (err) {
                console.error(err);
                alert('Server connection error. Please make sure the backend is running.');
            }
        });
    }

    // Doctor/Specialist Sign Up Submission
    if (signupDoctorForm) {
        signupDoctorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-doctor-name').value.trim();
            const email = document.getElementById('signup-doctor-email').value.trim();
            const license_number = document.getElementById('signup-doctor-license').value.trim();
            const hospital = document.getElementById('signup-doctor-hospital').value.trim();
            const specialization = document.getElementById('signup-doctor-specialization').value.trim();
            const password = document.getElementById('signup-doctor-password').value;
            
            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name, 
                        email, 
                        password, 
                        role: 'doctor',
                        license_number,
                        hospital,
                        specialization
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.detail || 'Registration failed.');
                    return;
                }
                const userData = await res.json();
                alert("Specialist registration successful!");
                
                handleLogin(userData.user.email, userData.user.role, userData.user.name, userData.token);
            } catch (err) {
                console.error(err);
                alert('Server connection error. Please make sure the backend is running.');
            }
        });
    }

    // Google Sign In button click triggers the chooser popup
    elements.btnGoogleSignIn.addEventListener('click', () => {
        closeAuthModal(); // Close the standard login modal
        elements.googleAuthModal.classList.add('active');
        // Reset form states
        elements.googleAccountList.style.display = 'block';
        elements.googleCustomForm.classList.remove('active');
        document.getElementById('google-custom-name').value = '';
        document.getElementById('google-custom-email').value = '';
    });

    // Close Google Auth Modal when clicking outside the card
    elements.googleAuthModal.addEventListener('click', (e) => {
        if (e.target === elements.googleAuthModal) {
            elements.googleAuthModal.classList.remove('active');
        }
    });

    // Handle account selection from the list
    elements.googleAccountList.querySelectorAll('.google-account-item').forEach(item => {
        item.addEventListener('click', async () => {
            if (item.id === 'google-use-custom') {
                // Show custom input form
                elements.googleAccountList.style.display = 'none';
                elements.googleCustomForm.classList.add('active');
                return;
            }
            
            const email = item.getAttribute('data-email');
            const name = item.getAttribute('data-name');
            
            await executeGoogleLogin(email, name);
        });
    });

    // Google Custom Form back button
    elements.btnGoogleBack.addEventListener('click', () => {
        elements.googleCustomForm.classList.remove('active');
        elements.googleAccountList.style.display = 'block';
    });

    // Google Custom Form submit
    elements.googleCustomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('google-custom-name').value.trim();
        const email = document.getElementById('google-custom-email').value.trim();
        
        await executeGoogleLogin(email, name);
    });

    async function executeGoogleLogin(email, name) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, token: 'mock_google_oauth_token' })
            });
            if (!res.ok) {
                const errData = await res.json();
                alert(errData.detail || 'Google authentication failed.');
                return;
            }
            const userData = await res.json();
            elements.googleAuthModal.classList.remove('active');
            handleLogin(userData.user.email, userData.user.role, userData.user.name, userData.token);
        } catch (err) {
            console.error(err);
            alert('Server connection error. Please make sure the backend is running.');
        }
    }

    // Sidebar navigation tabs
    elements.sidebarItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Diagnostic Modality selector
    elements.modalityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.modalityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            appState.selectedModality = btn.getAttribute('data-modality');
        });
    });

    // Vision Model Select Configurator in Diagnostic tab
    elements.selectVisionModel.addEventListener('change', () => {
        const val = elements.selectVisionModel.value;
        appState.selectedVisionModel = val;
        elements.activeVisionModelLabel.textContent = elements.selectVisionModel.options[elements.selectVisionModel.selectedIndex].text.split(' ')[0];
    });

    // File input change
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            triggerDiagnosticScan(file, false);
        }
    });

    // Drag and Drop listeners
    elements.dragDropZone.addEventListener('click', () => elements.fileInput.click());
    
    elements.dragDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dragDropZone.classList.add('dragover');
    });

    elements.dragDropZone.addEventListener('dragleave', () => {
        elements.dragDropZone.classList.remove('dragover');
    });

    elements.dragDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dragDropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            triggerDiagnosticScan(file, false);
        }
    });

    // Use Sample click listeners
    elements.btnUseSampleEcg.addEventListener('click', async () => {
        appState.selectedModality = 'ecg';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'ecg') b.classList.add('active');
            else b.classList.remove('active');
        });
        
        try {
            const response = await fetch('assets/ecg_sample.png');
            const blob = await response.blob();
            const file = new File([blob], 'ecg_sample.png', { type: 'image/png' });
            triggerDiagnosticScan(file, true);
        } catch (err) {
            console.error('Failed to load sample ECG', err);
        }
    });

    elements.btnUseSampleXray.addEventListener('click', async () => {
        appState.selectedModality = 'xray';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'xray') b.classList.add('active');
            else b.classList.remove('active');
        });
        
        try {
            const response = await fetch('assets/xray_sample.png');
            const blob = await response.blob();
            const file = new File([blob], 'xray_sample.png', { type: 'image/png' });
            triggerDiagnosticScan(file, true);
        } catch (err) {
            console.error('Failed to load sample X-Ray', err);
        }
    });

    elements.btnUseSampleMri.addEventListener('click', async () => {
        appState.selectedModality = 'mri';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'mri') b.classList.add('active');
            else b.classList.remove('active');
        });
        
        try {
            const response = await fetch('assets/mri_sample.png');
            const blob = await response.blob();
            const file = new File([blob], 'mri_sample.png', { type: 'image/png' });
            triggerDiagnosticScan(file, true);
        } catch (err) {
            console.error('Failed to load sample MRI', err);
        }
    });

    // Attention Heatmap toggle
    elements.btnToggleHeatmap.addEventListener('click', () => {
        elements.heatmapOverlay.classList.toggle('hidden');
    });

    // Action button to chat context
    elements.btnGotoChat.addEventListener('click', () => {
        switchTab('tab-chatbot');
    });

    // Chatbot suggestion prompts
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.getAttribute('data-prompt');
            processChatInput(text);
        });
    });

    // Chat Form Send
    elements.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = elements.chatTextInput.value.trim();
        if (text) {
            processChatInput(text);
            elements.chatTextInput.value = '';
        }
    });

    // Doctor signature submission validation
    elements.btnSubmitDoctorApproval.addEventListener('click', async () => {
        const recordId = appState.activeDoctorRecordId;
        if (!recordId) return;
        
        const note = elements.doctorClinicalNotes.value.trim();
        const signature = elements.doctorSignature.value.trim();
        const verdict = elements.doctorClinicalVerdict.value;
        
        if (!signature) {
            alert('Please supply an authorized doctor signature.');
            return;
        }
        
        try {
            const res = await fetch(`${API_BASE}/api/records/${recordId}/review`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token || ''}`
                },
                body: JSON.stringify({ verdict, notes: note, signature })
            });
            if (!res.ok) {
                const errData = await res.json();
                alert(errData.detail || 'Failed to submit clinical sign-off.');
                return;
            }
            alert(`Record ${recordId} clinical sign-off complete.`);
            await refreshDataViews();
        } catch (err) {
            console.error(err);
            alert('Server connection error. Please make sure the backend is running.');
        }
    });
}

// --- 10. Initialization Bootloader ---
window.addEventListener('DOMContentLoaded', () => {
    // Register clicks
    registerEventListeners();
    
    // Parse current user session if stored
    updateNavigationState();
    
    // Load icons
    lucide.createIcons();
    
    // Switch to initial view
    switchView('landing');
    
    // Trigger landing page stats counter animation
    initCountersObserver();
});
