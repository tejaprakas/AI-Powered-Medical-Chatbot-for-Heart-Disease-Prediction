/* ==========================================================================
   MediVision AI - Application logic, State Management, and AI Simulation
   ========================================================================== */

// --- 1. Mock Database & Local Storage Setup ---
const DEFAULT_RECORDS = [
    {
        id: "REC-8849",
        date: "2026-06-11 14:30",
        patientName: "David Miller",
        patientEmail: "patient@medivision.ai",
        modality: "ECG",
        modelUsed: "google/vit-base-patch16-224",
        probability: "94.8%",
        verdict: "Abnormal",
        pathology: "Possible Arrhythmia / PVCs Detected",
        signatures: "PVCs, tachycardia episodes in Lead II",
        scanUrl: "assets/ecg_sample.png",
        status: "Pending Review",
        doctorVerdict: "",
        doctorNotes: "",
        doctorSigned: ""
    },
    {
        id: "REC-5412",
        date: "2026-06-10 09:15",
        patientName: "Sarah Connor",
        patientEmail: "sarah.c@gmail.com",
        modality: "Chest X-Ray",
        modelUsed: "microsoft/resnet-50",
        probability: "12.4%",
        verdict: "Normal",
        pathology: "Clear Lung Fields / Sinus Rhythm",
        signatures: "No cardiomegaly or effusion observed",
        scanUrl: "assets/xray_sample.png",
        status: "Approved",
        doctorVerdict: "Confirmed - Normal",
        doctorNotes: "Lungs are clear, cardiac silhouette is within normal limits. No follow-up required.",
        doctorSigned: "Dr. Sarah Jenkins, MD"
    }
];

// Load or Initialize State
let records = JSON.parse(localStorage.getItem('medivision_records'));
if (!records) {
    records = DEFAULT_RECORDS;
    localStorage.setItem('medivision_records', JSON.stringify(records));
}

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

// --- 2. DOM Elements Mapping ---
const elements = {
    // Navigation
    navLogo: document.getElementById('nav-logo'),
    navLinks: document.querySelectorAll('.nav-links a'),
    btnSignInTrigger: document.getElementById('btn-login-trigger'),
    btnLaunchApp: document.getElementById('btn-launch-app'),
    btnLaunchAppAction: document.querySelector('.btn-launch-app-action'),
    
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
    tabBtnSignIn: document.getElementById('tab-btn-signin'),
    tabBtnSignUp: document.getElementById('tab-btn-signup'),
    signinForm: document.getElementById('signin-form'),
    signupForm: document.getElementById('signup-form'),
    btnQuickPatient: document.getElementById('btn-quick-patient'),
    btnQuickDoctor: document.getElementById('btn-quick-doctor'),
    
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
    if (currentUser) {
        elements.btnSignInTrigger.textContent = 'App Dashboard';
        elements.btnSignInTrigger.classList.remove('btn-secondary');
        elements.btnSignInTrigger.classList.add('btn-primary');
    } else {
        elements.btnSignInTrigger.textContent = 'Sign In';
        elements.btnSignInTrigger.classList.remove('btn-primary');
        elements.btnSignInTrigger.classList.add('btn-secondary');
    }
}

function switchView(viewName) {
    appState.currentView = viewName;
    
    if (viewName === 'landing') {
        elements.viewLanding.classList.add('active');
        elements.viewApp.classList.remove('active');
        
        // Update header active links
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        elements.navLinks[0].classList.add('active');
    } else if (viewName === 'app') {
        // Enforce Login to open workspace
        if (!currentUser) {
            openAuthModal();
            return;
        }
        elements.viewLanding.classList.remove('active');
        elements.viewApp.classList.add('active');
        
        // Setup user sidebar details
        elements.profileName.textContent = currentUser.name;
        elements.profileRole.textContent = `Role: ${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}`;
        
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
function openAuthModal(tab = 'signin') {
    elements.authModal.classList.add('active');
    toggleAuthTabs(tab);
}

function closeAuthModal() {
    elements.authModal.classList.remove('active');
}

function toggleAuthTabs(tab) {
    if (tab === 'signin') {
        elements.tabBtnSignIn.classList.add('active');
        elements.tabBtnSignUp.classList.remove('active');
        elements.signinForm.classList.add('active');
        elements.signupForm.classList.remove('active');
    } else {
        elements.tabBtnSignIn.classList.remove('active');
        elements.tabBtnSignUp.classList.add('active');
        elements.signinForm.classList.remove('active');
        elements.signupForm.classList.add('active');
    }
}

function handleLogin(email, role = 'patient', customName = '') {
    let name = customName;
    if (!name) {
        name = role === 'doctor' ? 'Dr. Sarah Jenkins, MD' : 'David Miller';
    }
    
    currentUser = {
        email: email,
        role: role,
        name: name
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
const DIAGNOSTIC_PROFILES = {
    ecg: {
        normal: {
            probability: 7.2,
            verdict: 'Normal',
            pathology: 'Sinus Rhythm',
            clinicalTags: 'Regular electrical cycles, normal PR interval'
        },
        abnormal: {
            probability: 94.8,
            verdict: 'Abnormal',
            pathology: 'Possible Arrhythmia / PVCs',
            clinicalTags: 'Premature ventricular contractions, elevated QT segment'
        }
    },
    xray: {
        normal: {
            probability: 11.5,
            verdict: 'Normal',
            pathology: 'Clear Lung Fields',
            clinicalTags: 'Normal cardiothoracic ratio (< 0.50), regular density'
        },
        abnormal: {
            probability: 84.2,
            verdict: 'Abnormal',
            pathology: 'Possible MediVisionmegaly',
            clinicalTags: 'Enlarged cardiac silhouette, pleural congestion'
        }
    },
    mri: {
        normal: {
            probability: 5.6,
            verdict: 'Normal',
            pathology: 'Unremarkable Left Ventricle',
            clinicalTags: 'Normal ejection fraction (62%), standard wall thickness'
        },
        abnormal: {
            probability: 79.5,
            verdict: 'Abnormal',
            pathology: 'Myocardial Infarction Risk',
            clinicalTags: 'Akinetic ventricular walls, localized tissue scarring'
        }
    }
};

function triggerDiagnosticScan(imgSrc, isSample = false, sampleType = 'normal') {
    if (appState.isScanning) return;
    
    appState.isScanning = true;
    elements.viewerEmpty.classList.add('hidden');
    elements.viewerActive.classList.remove('hidden');
    elements.scanPreviewImg.src = imgSrc;
    elements.scanLaser.classList.add('active');
    elements.heatmapOverlay.classList.add('hidden');
    elements.btnToggleHeatmap.setAttribute('disabled', 'true');
    
    elements.scanProgressBox.classList.remove('hidden');
    elements.predictionResultsBox.classList.add('hidden');
    
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 4;
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
            finalizeScanResult(imgSrc, isSample, sampleType);
        }
    }, 100);
}

function finalizeScanResult(imgSrc, isSample, sampleType) {
    appState.isScanning = false;
    elements.scanLaser.classList.remove('active');
    elements.scanProgressBox.classList.add('hidden');
    
    // Determine profile
    const modality = appState.selectedModality;
    const typeKey = isSample ? sampleType : (Math.random() > 0.4 ? 'abnormal' : 'normal'); // Default random for custom files
    const profile = DIAGNOSTIC_PROFILES[modality][typeKey];
    
    // Update labels
    elements.resultStatusBadge.textContent = profile.verdict;
    elements.resultStatusBadge.className = 'status-badge ' + (profile.verdict === 'Normal' ? 'normal-status' : 'critical');
    
    elements.resultProbabilityText.textContent = `${profile.probability}%`;
    elements.resultProbabilityFill.style.width = `${profile.probability}%`;
    
    // Color fill based on severity
    elements.resultProbabilityFill.className = 'probability-bar-fill';
    if (profile.probability < 20) {
        elements.resultProbabilityFill.classList.add('normal-fill');
    } else if (profile.probability < 60) {
        elements.resultProbabilityFill.classList.add('warning-fill');
    } else {
        elements.resultProbabilityFill.classList.add('danger-fill');
    }
    
    elements.resultPathologyName.textContent = profile.pathology;
    elements.resultClinicalTags.textContent = profile.clinicalTags;
    
    elements.btnToggleHeatmap.removeAttribute('disabled');
    elements.predictionResultsBox.classList.remove('hidden');
    
    // Save record to local state / localStorage
    const recordId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newRecord = {
        id: recordId,
        date: formattedDate,
        patientName: currentUser.name,
        patientEmail: currentUser.email,
        modality: modality.toUpperCase() + (modality === 'ecg' ? '' : ' Scan'),
        modelUsed: elements.selectVisionModel.options[elements.selectVisionModel.selectedIndex].text.split(' ')[0],
        probability: `${profile.probability}%`,
        verdict: profile.verdict,
        pathology: profile.pathology,
        signatures: profile.clinicalTags,
        scanUrl: imgSrc,
        status: 'Pending Review',
        doctorVerdict: '',
        doctorNotes: '',
        doctorSigned: ''
    };
    
    // Push new entry
    records.unshift(newRecord);
    localStorage.setItem('medivision_records', JSON.stringify(records));
    
    // Set active chatbot/report context
    appState.activeContextRecord = newRecord;
    
    // Load context in Chatbot sidebar
    loadChatbotContext(newRecord);
    
    // Refresh table and doctor queues
    refreshDataViews();
}

// --- 6. Chatbot Engine Simulator ---
const CHATBOT_RESPONSES = {
    ecg: {
        abnormal: {
            intro: "I see your ECG diagnostic results show a high probability of anomalies (94.8% probability) pointing to a potential Arrhythmia or Premature Ventricular Contractions (PVCs). I can explain these findings or provide lifestyle precautions.",
            whatItShows: "• Wider-than-average QRS complex spikes on the rhythm strip.<br>• Ectopic beats firing prematurely before the normal SA node cycle.<br>• Short periods of tachycardic bursts in Lead II.",
            whatItMeans: "The heart's electrical system is experiencing localized conductivity instability. Beats are initiated in the ventricles instead of the sinoatrial node, causing cardiac cycles to fall out of rhythmic synchrony.",
            alternativeRecommendations: "• <strong>Electrolyte Balance:</strong> Consume magnesium and potassium-dense foods (e.g., avocados, cooked spinach, Swiss chard) to support electrical membrane stability.<br>• <strong>Vagal Activation:</strong> Practice slow diaphragmatic breathing (inhale 5 seconds, exhale 7 seconds) and use cool face compresses to stimulate the vagus nerve, helping to lower heart rate and reduce ectopic events.<br>• <strong>CoQ10 Integration:</strong> Supplement with 100-200mg of Coenzyme Q10 daily (subject to physician sign-off) to improve cellular ATP bioenergetics within the cardiac tissue.<br>• <strong>Mitigate Sympathetic Tone:</strong> Strictly eliminate synthetic energy drinks, excess coffee, and sleep-depriving habits. Shift to calming teas like chamomile to reduce adrenaline spikes.",
            symptoms: "Arrhythmia symptoms commonly include palpitations (a fluttering or racing heart), mild chest discomfort, shortness of breath, lightheadedness, or fatigue during exertion.",
            precautions: "Given the high probability (94.8%) of ventricular anomalies on your ECG, please take these precautions: \n1. **Avoid Stimulants:** Strictly limit caffeine, alcohol, and nicotine.\n2. **Avoid Intrusive Workouts:** Refrain from heavy weight lifting or running until cleared by a doctor.\n3. **Monitor Vitals:** Check your resting pulse daily.\n4. **Clinician Referral:** This result has been routed to our clinical desk. We advise booking a diagnostic consultation."
        },
        normal: {
            intro: "Your ECG scan shows a 7.2% probability of anomaly, indicating a healthy normal sinus rhythm. Your heart's electrical pathways are firing correctly.",
            whatItShows: "• A regular heart rate between 60-100 BPM.<br>• Symmetrical P waves preceding every standard QRS complex.<br>• Constant and regular PR intervals.",
            whatItMeans: "Your heart is contracting via a healthy sinus rhythm, demonstrating optimal electrical conductivity without signs of ectopic signals.",
            alternativeRecommendations: "• <strong>MediVision Preservation:</strong> Perform 30 minutes of low-intensity aerobic conditioning (like walking, cycling) 5 days a week to support stroke volume and lower resting pressure.<br>• <strong>Vessel Elasticity:</strong> Include healthy monounsaturated fats (extra virgin olive oil, walnuts) to keep arteries highly flexible.<br>• <strong>Hydration Maintenance:</strong> Stay hydrated with clean water and coconut water to prevent transient electrolyte fluctuation.",
            symptoms: "A normal sinus rhythm means you shouldn't feel irregular fluttering. If you still experience chest pains or palpitations, please report them directly to a physician, as non-electrical conditions could be present.",
            precautions: "Keep up the excellent work! To support your cardiovascular health: exercise moderately 150 mins per week, maintain a diet low in trans fats, and limit high sodium inputs."
        }
    },
    xray: {
        abnormal: {
            intro: "Your Chest X-Ray scan shows signs of MediVisionmegaly (an enlarged heart) with an AI risk confidence of 84.2%. This means the width of your heart exceeds 50% of the interior chest diameter.",
            whatItShows: "• Enlargement of the cardiac silhouette shape, exceeding 0.50 of the ribcage width.<br>• Moderate elevation of diaphragm lines.<br>• Minor pleural margins congestion.",
            whatItMeans: "The heart muscle is working under chronically elevated workload, leading to hypertrophy (enlargement) of the ventricles, often caused by untreated high blood pressure or valve issues.",
            alternativeRecommendations: "• <strong>Strict Sodium Limitation:</strong> Limit sodium to under 1,500 mg daily to decrease fluid retention, vascular volume, and diastolic pressure.<br>• <strong>Natural Vasodilators:</strong> Incorporate organic beetroot juice (rich in dietary nitrates) or garlic extract to naturally relax blood vessels and reduce heart workload.<br>• <strong>Anti-Gravity Sleeping:</strong> Elevate the head of your bed by 15-30 degrees using a wedge pillow to prevent nocturnal fluid accumulation in the chest, easing breathing.<br>• <strong>Hawthorn Berry MediVisiontonic:</strong> Research traditional cardiotonic herbs like Hawthorn Berry to naturally support vascular blood flow and coronary circulation.",
            symptoms: "An enlarged heart (cardiomegaly) may cause fluid build-up in the lungs, leading to shortness of breath (especially when lying flat), cough, leg swelling (edema), and fatigue.",
            precautions: "For suspected MediVisionmegaly:\n1. **Restrict Fluid & Sodium:** High salt intake increases blood volume, putting extra strain on the heart muscle.\n2. **Avoid Heavy Exertion:** Avoid activities that trigger immediate shortness of breath.\n3. **Sleep Elevated:** Use extra pillows to help breathing at night.\n4. **Consultation:** Please review these X-ray margins with a clinician for an echocardiogram referral."
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
            alternativeRecommendations: "• <strong>High-Dose Omega-3s:</strong> Supplement with 2-3g of high-quality fish oil (EPA/DHA) daily to alleviate chronic cardiovascular inflammation and protect cell membrane structures.<br>• <strong>Mediterranean Lifestyle:</strong> Rely on a diet rich in raw nuts, legumes, fresh vegetables, and fatty fish to lower secondary event rates.<br>• <strong>Structured MediVisionvascular Rehab:</strong> Join a local cardiac rehabilitation program to complete supervised, heart-rate-limited conditioning to slowly rebuild stroke volume.<br>• <strong>Antioxidant Protection:</strong> Take grape seed extract or consume polyphenols to prevent oxidative stress in recovering heart tissues.",
            symptoms: "Myocardial ischemia or infarction risks are marked by pressure/squeezing in the center of the chest, pain spreading to the left arm or jaw, cold sweats, and nausea.",
            precautions: "For suspected myocardial injury:\n1. **Zero Stress:** Rest immediately; avoid elevating your heart rate.\n2. **Emergency Preparedness:** If you experience active chest pressure lasting over 5 minutes, seek emergency medical services immediately.\n3. **Follow-Up:** A cardiac MRI finding of localized akinetic walls requires a cardiologist's assessment for coronary artery clearance."
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

function loadChatbotContext(record) {
    elements.chatContextEmpty.classList.add('hidden');
    elements.chatContextLoaded.classList.remove('hidden');
    
    elements.chatContextThumb.src = record.scanUrl;
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

function processChatInput(userInput) {
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
    
    setTimeout(() => {
        // Remove temp spinner
        const spinner = elements.chatMessagesContainer.querySelector('.temp-spinner');
        if (spinner) spinner.remove();
        
        let responseText = "";
        const cleanInput = userInput.toLowerCase();
        
        // Context-aware variables
        let modalityKey = 'ecg';
        let verdictKey = 'abnormal';
        
        if (appState.activeContextRecord) {
            const r = appState.activeContextRecord;
            modalityKey = r.modality.toLowerCase().includes('x-ray') ? 'xray' : (r.modality.toLowerCase().includes('mri') ? 'mri' : 'ecg');
            verdictKey = r.verdict.toLowerCase();
        }
        
        // Parser match
        if (cleanInput.includes('precaution') || cleanInput.includes('prevent') || cleanInput.includes('should i do')) {
            responseText = CHATBOT_RESPONSES[modalityKey][verdictKey].precautions;
        } else if (cleanInput.includes('symptom') || cleanInput.includes('sign') || cleanInput.includes('feel')) {
            responseText = CHATBOT_RESPONSES[modalityKey][verdictKey].symptoms;
        } else if (cleanInput.includes('how does this ai work') || cleanInput.includes('vision transformer') || cleanInput.includes('vit') || cleanInput.includes('dataset')) {
            responseText = "This system uses a Vision Transformer (ViT) model, trained on biomedical images. ViT breaks medical scans down into patches (like puzzle pieces) and uses self-attention mechanisms to map dependencies, flagging anomalies such as cardiac hypertrophy or myocardial ischemia with high confidence. The models are fine-tuned on clinical datasets including MIMIC-CXR and CheXpert.";
        } else if (cleanInput.includes('cardiomegaly')) {
            responseText = "MediVisionmegaly is the medical term for an enlarged heart. It is not a disease itself, but rather a sign of another clinical condition such as high blood pressure, coronary artery disease, or heart valve issues.";
        } else if (cleanInput.includes('arrhythmia')) {
            responseText = "An arrhythmia is a disorder of the heart rate or rhythm, causing the heart to beat too fast (tachycardia), too slow (bradycardia), or irregularly.";
        } else if (cleanInput.includes('hello') || cleanInput.includes('hi') || cleanInput.includes('hey')) {
            responseText = "Hello! I am here to assist with your medical diagnostic questions. You can ask me to explain your scan symptoms, suggest cardiovascular precautions, or clarify how the transformer network calculates disease probabilities.";
        } else if (cleanInput.includes('doctor') || cleanInput.includes('physician') || cleanInput.includes('appointment')) {
            responseText = "It is highly recommended to share these AI diagnostic records with a doctor. If you are signed in as a patient, you can check the 'Medical Records' tab to see when Dr. Jenkins clinical sign-off is completed.";
        } else {
            // General clinical fallback
            responseText = `As your medical chatbot assistant, I've noted your question: "${userInput}". Regarding your cardiovascular parameters, always ensure you keep a log of symptoms, maintain low sodium intake, and seek a clinician's evaluation. Let me know if you would like precautions or symptoms details for your active diagnostic case.`;
        }
        
        appendChatMessage('bot', responseText);
    }, 1200);
}

// --- 7. UI Table and Queue Refresh Loops ---
function refreshDataViews() {
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
        
        let actionBtn = `<button class="btn btn-secondary btn-sm" onclick="triggerReportDownload('${r.id}')"><i data-lucide="download"></i> Report</button>`;
        
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
    
    elements.reviewScanImg.src = record.scanUrl;
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
                <h4>Clinical Physician Validation</h4>
                <p><strong>Verdict:</strong> ${record.doctorVerdict}</p>
                <p><strong>Clinical Notes:</strong> ${record.doctorNotes || 'No notes added.'}</p>
           </div>`
        : `<div class="print-notes-section">
                <h4>Clinical Physician Validation</h4>
                <p><em>This report was automatically compiled by the MediVision AI neural diagnostic pipeline. Official physician notes and physical clinician verification signature are pending.</em></p>
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
                <div class="print-meta-item"><strong>Patient Name:</strong> ${record.patientName}</div>
                <div class="print-meta-item"><strong>Patient Email:</strong> ${record.patientEmail}</div>
                <div class="print-meta-item"><strong>Record File ID:</strong> ${record.id}</div>
                <div class="print-meta-item"><strong>Scan Modality:</strong> ${record.modality}</div>
                <div class="print-meta-item"><strong>Inference Neural Framework:</strong> ${record.modelUsed}</div>
                <div class="print-meta-item"><strong>Regulatory Clearance:</strong> FDA Preliminary Sandbox</div>
            </div>
            
            <div class="print-diagnostics-section">
                <div class="print-image-panel">
                    <img src="${record.scanUrl}" alt="Scan File">
                    <span class="print-image-label">Fig 1. Multi-modal patient scan input</span>
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
                <p style="font-size: 0.9rem; line-height: 1.5; color: #222222;">
                    ${profile.alternativeRecommendations}
                </p>
            </div>
            
            ${docVerdictSection}
            
            <div class="print-signatures">
                <div class="signature-slot">
                    <div class="signature-line"></div>
                    <div class="signature-label">Patient Acknowledgement</div>
                </div>
                <div class="signature-slot">
                    <div class="signature-line">${record.doctorSigned ? `<span style="font-family: 'Outfit'; font-style: italic; font-weight: 500;">${record.doctorSigned}</span>` : ''}</div>
                    <div class="signature-label">Authorized Clinician Signature</div>
                </div>
            </div>
        </div>
    `;
    
    // Wait for DOM to register and launch print
    setTimeout(() => {
        window.print();
    }, 250);
};

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
    elements.btnSignInTrigger.addEventListener('click', () => {
        if (currentUser) {
            switchView('app');
        } else {
            openAuthModal('signin');
        }
    });

    elements.btnLaunchApp.addEventListener('click', () => {
        if (currentUser) {
            switchView('app');
        } else {
            openAuthModal('signin');
        }
    });

    elements.btnLaunchAppAction.addEventListener('click', () => {
        if (currentUser) {
            switchView('app');
        } else {
            openAuthModal('signin');
        }
    });

    // Auth modal controls
    elements.btnCloseAuth.addEventListener('click', closeAuthModal);
    elements.tabBtnSignIn.addEventListener('click', () => toggleAuthTabs('signin'));
    elements.tabBtnSignUp.addEventListener('click', () => toggleAuthTabs('signup'));
    
    elements.btnQuickPatient.addEventListener('click', () => {
        handleLogin('patient@medivision.ai', 'patient', 'David Miller');
    });
    
    elements.btnQuickDoctor.addEventListener('click', () => {
        handleLogin('doctor@medivision.ai', 'doctor', 'Dr. Sarah Jenkins, MD');
    });
    
    elements.btnLogout.addEventListener('click', handleLogout);
    
    // Sign In Submission
    elements.signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value;
        const role = email.toLowerCase().includes('doctor') ? 'doctor' : 'patient';
        const name = role === 'doctor' ? 'Dr. Sarah Jenkins, MD' : email.split('@')[0];
        handleLogin(email, role, name);
    });

    // Sign Up Submission
    elements.signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const name = document.getElementById('signup-name').value;
        const role = document.getElementById('signup-role').value;
        handleLogin(email, role, name);
    });

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
            const reader = new FileReader();
            reader.onload = (event) => {
                triggerDiagnosticScan(event.target.result);
            };
            reader.readAsDataURL(file);
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
            const reader = new FileReader();
            reader.onload = (event) => {
                triggerDiagnosticScan(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Use Sample click listeners
    elements.btnUseSampleEcg.addEventListener('click', () => {
        appState.selectedModality = 'ecg';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'ecg') b.classList.add('active');
            else b.classList.remove('active');
        });
        triggerDiagnosticScan('assets/ecg_sample.png', true, 'abnormal');
    });

    elements.btnUseSampleXray.addEventListener('click', () => {
        appState.selectedModality = 'xray';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'xray') b.classList.add('active');
            else b.classList.remove('active');
        });
        triggerDiagnosticScan('assets/xray_sample.png', true, 'abnormal');
    });

    elements.btnUseSampleMri.addEventListener('click', () => {
        appState.selectedModality = 'mri';
        elements.modalityButtons.forEach(b => {
            if (b.getAttribute('data-modality') === 'mri') b.classList.add('active');
            else b.classList.remove('active');
        });
        triggerDiagnosticScan('assets/mri_sample.png', true, 'abnormal');
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
    elements.btnSubmitDoctorApproval.addEventListener('click', () => {
        const recordId = appState.activeDoctorRecordId;
        if (!recordId) return;
        
        const note = elements.doctorClinicalNotes.value.trim();
        const signature = elements.doctorSignature.value.trim();
        const verdict = elements.doctorClinicalVerdict.value;
        
        if (!signature) {
            alert('Please supply an authorized doctor signature.');
            return;
        }
        
        // Update record in database
        const index = records.findIndex(r => r.id === recordId);
        if (index !== -1) {
            records[index].status = verdict.toLowerCase().includes('confirm') ? 'Approved' : 'Rejected';
            records[index].doctorVerdict = verdict;
            records[index].doctorNotes = note;
            records[index].doctorSigned = signature;
            
            localStorage.setItem('medivision_records', JSON.stringify(records));
            
            alert(`Record ${recordId} clinical sign-off complete.`);
            
            // Reload and refresh
            refreshDataViews();
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
});
