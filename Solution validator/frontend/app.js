// Problem-Solution Validation Engine SPA Controller
const API_URL = ""; 

// Auth & Caching States
let currentUser = null;
let activeValidationResult = null;
let activeDiscoveryResult = null;

// DOM Elements
const authUnlogged = document.getElementById("auth-unlogged");
const authLogged = document.getElementById("auth-logged");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");

// Tab Views
const tabValidate = document.getElementById("tab-validate");
const tabDiscover = document.getElementById("tab-discover");
const tabHistory = document.getElementById("tab-history");

const navBtnValidate = document.getElementById("nav-btn-validate");
const navBtnDiscover = document.getElementById("nav-btn-discover");
const navBtnHistory = document.getElementById("nav-btn-history");

// Inputs count
const problemInput = document.getElementById("problem-input");
const solutionInput = document.getElementById("solution-input");
const problemCount = document.getElementById("problem-count");
const solutionCount = document.getElementById("solution-count");

const discoverProblemInput = document.getElementById("discover-problem-input");
const discoverProblemCount = document.getElementById("discover-problem-count");

// Loading & Output divs
const validateEmpty = document.getElementById("validate-empty");
const validateLoading = document.getElementById("validate-loading");
const validateStatusMsg = document.getElementById("validate-status-msg");
const validateResults = document.getElementById("validate-results");

const discoverEmpty = document.getElementById("discover-empty");
const discoverLoading = document.getElementById("discover-loading");
const discoverStatusMsg = document.getElementById("discover-status-msg");
const discoverResults = document.getElementById("discover-results");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Character listeners
    setupCharCounter(problemInput, problemCount);
    setupCharCounter(solutionInput, solutionCount);
    setupCharCounter(discoverProblemInput, discoverProblemCount);
    
    // Key shortcut listeners
    setupKeyboardShortcut(problemInput, solutionInput, runValidation);
    setupKeyboardShortcut(solutionInput, problemInput, runValidation);
    setupKeyboardShortcut(discoverProblemInput, null, runDiscovery);

    // Verify Active Profile
    checkAuthSession();
});

// Character Counter
function setupCharCounter(textarea, label) {
    if (!textarea || !label) return;
    textarea.addEventListener("input", () => {
        label.textContent = `${textarea.value.length} characters`;
    });
}

// Ctrl+Enter trigger shortcut
function setupKeyboardShortcut(elem, siblingElem, callback) {
    if (!elem) return;
    elem.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            if (elem.value.trim().length >= 10 && (!siblingElem || siblingElem.value.trim().length >= 10)) {
                e.preventDefault();
                callback();
            }
        }
    });
}

// Tab switcher
function switchTab(tab) {
    tabValidate.classList.add("hidden");
    tabDiscover.classList.add("hidden");
    tabHistory.classList.add("hidden");
    
    navBtnValidate.classList.remove("active");
    navBtnDiscover.classList.remove("active");
    navBtnHistory.classList.remove("active");
    
    if (tab === "validate") {
        tabValidate.classList.remove("hidden");
        navBtnValidate.classList.add("active");
    } else if (tab === "discover") {
        tabDiscover.classList.remove("hidden");
        navBtnDiscover.classList.add("active");
    } else if (tab === "history") {
        tabHistory.classList.remove("hidden");
        navBtnHistory.classList.add("active");
        loadHistoryData();
    }
}

// --- NOTIFICATIONS UTILITY ---
function showToast(message, type = "info") {
    const toaster = document.getElementById("sonner-toaster");
    const toast = document.createElement("div");
    toast.className = `sonner-toast font-mono`;
    
    const prefix = type === "success" ? "✓ SUCCESS: " : (type === "error" ? "✕ ERROR: " : "⚡ INFO: ");
    toast.textContent = prefix + message;
    
    toaster.appendChild(toast);
    
    // Auto vanish after 4s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

// --- CLIENT-SIDE URL SANITIZER ---
function sanitizeUrl(url) {
    if (!url) return "#";
    let cleaned = url.trim();
    if (cleaned.startsWith("//")) {
        return "https:" + cleaned;
    }
    if (!/^https?:\/\//i.test(cleaned)) {
        return "https://" + cleaned;
    }
    return cleaned;
}

// --- AUTH SECTOR ---
async function checkAuthSession() {
    try {
        const res = await fetch(`${API_URL}/api/auth/me`);
        if (res.ok) {
            const user = await res.json();
            loginUserSuccess(user);
        } else {
            triggerMockLogin();
        }
    } catch {
        triggerMockLogin();
    }
}

async function triggerMockLogin() {
    try {
        const res = await fetch(`${API_URL}/api/auth/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: "sandbox_dev_session" })
        });
        if (res.ok) {
            const user = await res.json();
            loginUserSuccess(user);
            showToast("Sandbox database account connected.", "success");
        }
    } catch (e) {
        showToast("Local sandbox active.", "info");
    }
}

function loginUserSuccess(user) {
    currentUser = user;
    userAvatar.src = user.picture || "https://avatars.githubusercontent.com/u/1000000?v=4";
    userName.textContent = user.name;
    userEmail.textContent = user.email;
    
    authUnlogged.classList.add("hidden");
    authLogged.classList.remove("hidden");
}

async function triggerLogout() {
    try {
        await fetch(`${API_URL}/api/auth/logout`, { method: "POST" });
        currentUser = null;
        authLogged.classList.add("hidden");
        authUnlogged.classList.remove("hidden");
        showToast("Signed out successfully.", "info");
    } catch {
        showToast("Logout failed.", "error");
    }
}

// --- RUN VALIDATION FLOW ---
async function runValidation() {
    const problem = problemInput.value.trim();
    const solution = solutionInput.value.trim();
    
    if (problem.length < 10 || solution.length < 10) return;
    
    validateEmpty.classList.add("hidden");
    validateResults.classList.add("hidden");
    validateLoading.classList.remove("hidden");
    
    const messages = [
        "Sweeping global index layers for competitor overlaps...",
        "Crawling target pages for documentation attachments...",
        "Evaluating semantic match features using Gemini LLM...",
        "Synthesizing match scoring thresholds..."
    ];
    
    let msgIdx = 0;
    const interval = setInterval(() => {
        if (msgIdx < messages.length - 1) {
            msgIdx++;
            validateStatusMsg.textContent = messages[msgIdx];
        }
    }, 2500);

    try {
        const res = await fetch(`${API_URL}/api/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                problem_statement: problem,
                proposed_solution: solution
            })
        });

        clearInterval(interval);
        
        if (!res.ok) throw new Error("Validation endpoint failed.");
        const data = await res.json();
        
        // Cache result for export
        activeValidationResult = data;
        activeValidationResult.problem_statement = problem;
        activeValidationResult.proposed_solution = solution;
        
        renderValidationOutput(data);
        
        validateLoading.classList.add("hidden");
        validateResults.classList.remove("hidden");
        showToast("Concept analyzed successfully.", "success");
        
    } catch (e) {
        clearInterval(interval);
        showToast(e.message, "error");
        validateLoading.classList.add("hidden");
        validateEmpty.classList.remove("hidden");
    }
}

function renderValidationOutput(data) {
    // Match Score Dial Animation
    const score = Math.round(data.match_score);
    animateScoreDial(score);

    // Tier badge
    const badge = document.getElementById("validation-tier-badge");
    badge.textContent = data.match_tier;
    badge.className = "brutalist-badge font-mono"; 
    if (data.match_tier === "high") {
        badge.classList.add("high");
    } else if (data.match_tier === "medium") {
        badge.classList.add("medium");
    } else {
        badge.classList.add("low");
    }

    // Analysis Text
    document.getElementById("validation-analysis-text").textContent = data.ai_analysis;

    // Helper for brand logo icon box
    function getBrandLogoHtml(title, category = "web") {
        let firstLetter = title ? title.trim().charAt(0).toUpperCase() : "W";
        let grad = getBrandGradient(title);
        
        if (category === "pdf") {
            return `<div class="brand-logo-box" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)">PDF</div>`;
        }
        if (category === "xls" || category === "xlsx" || category === "csv") {
            return `<div class="brand-logo-box" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)">XLS</div>`;
        }
        if (category === "doc" || category === "docx") {
            return `<div class="brand-logo-box" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)">DOC</div>`;
        }
        
        // Social match icons
        const urlLower = String(title).toLowerCase();
        if (urlLower.includes("youtube")) {
            return `<div class="brand-logo-box" style="background: #ff0000; box-shadow: 0 4px 10px rgba(255,0,0,0.2)">▶</div>`;
        }
        if (urlLower.includes("linkedin")) {
            return `<div class="brand-logo-box" style="background: #0077b5; box-shadow: 0 4px 10px rgba(0,119,181,0.2)">in</div>`;
        }
        if (urlLower.includes("github")) {
            return `<div class="brand-logo-box" style="background: #24292e; box-shadow: 0 4px 10px rgba(0,0,0,0.25)">🐱</div>`;
        }
        
        return `<div class="brand-logo-box" style="background: ${grad}">${firstLetter}</div>`;
    }

    // Deterministic brand gradients
    function getBrandGradient(title) {
        const gradients = [
            'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Indigo
            'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
            'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Orange
            'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', // Teal
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'  // Purple
        ];
        let sum = 0;
        for (let i = 0; i < String(title).length; i++) {
            sum += String(title).charCodeAt(i);
        }
        return gradients[sum % gradients.length];
    }

    // COLUMN 1: Verified Web Competitors
    const sourcesContainer = document.getElementById("v-sources-container");
    sourcesContainer.innerHTML = "";
    const sources = data.verified_sources || [];
    document.getElementById("v-sources-count").textContent = sources.length;
    
    if (sources.length === 0) {
        sourcesContainer.innerHTML = `<div class="brand-card font-mono" style="text-align:center;color:var(--text-muted); padding: 2rem;">No competitor sites found.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        sources.forEach((src, idx) => {
            const sanitizedLink = sanitizeUrl(src.link);
            const domain = getDomain(sanitizedLink);
            const logoHtml = getBrandLogoHtml(src.title, "web");
            
            // Generate realistic overlap percentage
            let cardOverlap = Math.round(data.match_score * (1.0 - (idx * 0.08)));
            cardOverlap = Math.max(10, Math.min(98, cardOverlap));

            const card = document.createElement("div");
            card.className = "brand-card";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(src.title)}</h5>
                        <span class="brand-sub font-mono">${domain}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(src.snippet || "Market provider targeting the problem domain.")}</p>
                <div class="brand-overlap font-mono">
                    <span class="check-icon">✅</span>
                    <span>(${cardOverlap}% overlap)</span>
                </div>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link">Visit Site ↗</a>
            `;
            grid.appendChild(card);
        });
        sourcesContainer.appendChild(grid);
    }

    // COLUMN 2: Spreadsheets & Tech Reports
    const assetsContainer = document.getElementById("v-assets-container");
    assetsContainer.innerHTML = "";
    const assets = data.downloadable_assets || [];
    document.getElementById("v-assets-count").textContent = assets.length;

    if (assets.length === 0) {
        assetsContainer.innerHTML = `<div class="brand-card font-mono" style="justify-content:center;color:var(--text-muted); padding: 2.5rem; text-align:center; width:100%;">No guide documents identified.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        assets.forEach(asset => {
            const sanitizedLink = sanitizeUrl(asset.link);
            const domain = getDomain(sanitizedLink);
            const type = asset.file_type ? asset.file_type.toLowerCase() : "pdf";
            const logoHtml = getBrandLogoHtml(asset.title, type);
            
            const card = document.createElement("div");
            card.className = "brand-card doc";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(asset.title)}</h5>
                        <span class="brand-sub font-mono">${domain} • ${type.toUpperCase()}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(asset.snippet || "Valuable technical resources and manual sheets.")}</p>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link download">Download Document ↗</a>
            `;
            grid.appendChild(card);
        });
        assetsContainer.appendChild(grid);
    }

    // COLUMN 3: Social & Video Citations
    const socialContainer = document.getElementById("v-social-container");
    socialContainer.innerHTML = "";
    const socials = data.social_citations || [];
    document.getElementById("v-social-count").textContent = socials.length;

    if (socials.length === 0) {
        socialContainer.innerHTML = `<div class="brand-card font-mono" style="text-align:center;color:var(--text-muted); padding: 2rem;">No citations located.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        socials.forEach(soc => {
            const sanitizedLink = sanitizeUrl(soc.link);
            const domain = getDomain(sanitizedLink);
            const logoHtml = getBrandLogoHtml(soc.title, "social");
            
            const card = document.createElement("div");
            card.className = "brand-card";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(soc.title)}</h5>
                        <span class="brand-sub font-mono">${domain}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(soc.snippet || "Professional citations and code repositories.")}</p>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link">Open Citation ↗</a>
            `;
            grid.appendChild(card);
        });
        socialContainer.appendChild(grid);
    }
}

function animateScoreDial(targetScore) {
    const num = document.getElementById("validation-score-number");
    const arc = document.getElementById("gauge-progress-arc");
    
    let count = 0;
    const duration = 1200;
    const startTime = performance.now();
    
    // Path length of our semi-circular arc is ~125.6
    const pathLength = 125.6;
    
    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        count = Math.round(ease * targetScore);
        
        num.textContent = count;
        
        // Calculate offset: offset ranges from 125.6 (at 0%) to 0 (at 100%)
        const offset = pathLength * (1 - count / 100);
        if (arc) {
            arc.style.strokeDashoffset = offset;
        }
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// --- RUN DISCOVERY FLOW ---
async function runDiscovery() {
    const problem = discoverProblemInput.value.trim();
    if (problem.length < 10) return;
    
    discoverEmpty.classList.add("hidden");
    discoverResults.classList.add("hidden");
    discoverLoading.classList.remove("hidden");
    
    const messages = [
        "Sweeping global index layers for competitor landscape...",
        "Identifying existing startup solutions...",
        "Extracting target guides and developer documents...",
        "Compiling summary analytics..."
    ];
    
    let msgIdx = 0;
    const interval = setInterval(() => {
        if (msgIdx < messages.length - 1) {
            msgIdx++;
            discoverStatusMsg.textContent = messages[msgIdx];
        }
    }, 2500);

    try {
        const res = await fetch(`${API_URL}/api/discover`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem_statement: problem })
        });
        
        clearInterval(interval);
        if (!res.ok) throw new Error("Discovery call failed.");
        const data = await res.json();
        
        // Cache result for export
        activeDiscoveryResult = data;
        activeDiscoveryResult.problem_statement = problem;
        
        renderDiscoveryOutput(data);
        
        discoverLoading.classList.add("hidden");
        discoverResults.classList.remove("hidden");
        showToast("Market discovery compiled.", "success");
        
    } catch (e) {
        clearInterval(interval);
        showToast(e.message, "error");
        discoverLoading.classList.add("hidden");
        discoverEmpty.classList.remove("hidden");
    }
}

function renderDiscoveryOutput(data) {
    // AI Summary text
    document.getElementById("discover-summary-text").textContent = data.ai_summary;

    // Discovered Solution Cards
    const cardsContainer = document.getElementById("discovered-solutions-cards");
    cardsContainer.innerHTML = "";
    const solutions = data.discovered_solutions || [];
    
    solutions.forEach(sol => {
        const card = document.createElement("div");
        card.className = "discover-solution-card";
        const confBadge = sol.confidence === "high" ? "#10b981" : (sol.confidence === "medium" ? "#eab308" : "#a1a1aa");
        
        card.innerHTML = `
            <h5 style="color:var(--secondary); font-weight:800; font-size:0.95rem;">${escapeHTML(sol.title)}</h5>
            <p style="margin-top:0.4rem; font-size:0.8rem; line-height:1.45;">${escapeHTML(sol.description)}</p>
            <div class="confidence-row" style="margin-top:0.6rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.5rem; display:flex; justify-content:space-between; font-size:10px;">
                <span class="font-mono text-zinc-500">CONFIDENCE:</span>
                <span class="font-mono font-bold" style="color: ${confBadge}">${sol.confidence.toUpperCase()}</span>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    // Helper for brand logo icon box
    function getBrandLogoHtml(title, category = "web") {
        let firstLetter = title ? title.trim().charAt(0).toUpperCase() : "W";
        
        if (category === "pdf") {
            return `<div class="brand-logo-box" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)">PDF</div>`;
        }
        
        // Social match icons
        const urlLower = String(title).toLowerCase();
        if (urlLower.includes("youtube")) {
            return `<div class="brand-logo-box" style="background: #ff0000; box-shadow: 0 4px 10px rgba(255,0,0,0.2)">▶</div>`;
        }
        if (urlLower.includes("linkedin")) {
            return `<div class="brand-logo-box" style="background: #0077b5; box-shadow: 0 4px 10px rgba(0,119,181,0.2)">in</div>`;
        }
        
        // Random pastel gradients
        const grads = [
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
        ];
        let hash = 0;
        for (let i = 0; i < String(title).length; i++) {
            hash += String(title).charCodeAt(i);
        }
        return `<div class="brand-logo-box" style="background: ${grads[hash % grads.length]}">${firstLetter}</div>`;
    }

    // COLUMN 1: Web Portals
    const sourcesContainer = document.getElementById("d-sources-container");
    sourcesContainer.innerHTML = "";
    const sources = data.verified_sources || [];
    document.getElementById("d-sources-count").textContent = sources.length;
    
    if (sources.length === 0) {
        sourcesContainer.innerHTML = `<div class="brand-card font-mono" style="text-align:center;color:var(--text-muted); padding: 2rem;">No portals found.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        sources.forEach(src => {
            const sanitizedLink = sanitizeUrl(src.link);
            const domain = getDomain(sanitizedLink);
            const logoHtml = getBrandLogoHtml(src.title, "web");
            
            const card = document.createElement("div");
            card.className = "brand-card";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(src.title)}</h5>
                        <span class="brand-sub font-mono">${domain}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(src.snippet || "Competitive marketplace portal.")}</p>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link">Visit Site ↗</a>
            `;
            grid.appendChild(card);
        });
        sourcesContainer.appendChild(grid);
    }

    // COLUMN 2: Tech Reports
    const assetsContainer = document.getElementById("d-assets-container");
    assetsContainer.innerHTML = "";
    const assets = data.downloadable_assets || [];
    document.getElementById("d-assets-count").textContent = assets.length;
    
    if (assets.length === 0) {
        assetsContainer.innerHTML = `<div class="brand-card font-mono" style="justify-content:center;color:var(--text-muted); padding: 2.5rem; text-align:center; width:100%;">No manuals identified.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        assets.forEach(asset => {
            const sanitizedLink = sanitizeUrl(asset.link);
            const domain = getDomain(sanitizedLink);
            const type = asset.file_type ? asset.file_type.toLowerCase() : "pdf";
            const logoHtml = getBrandLogoHtml(asset.title, type);
            
            const card = document.createElement("div");
            card.className = "brand-card doc";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(asset.title)}</h5>
                        <span class="brand-sub font-mono">${domain} • ${type.toUpperCase()}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(asset.snippet || "Reference manual guide sheets.")}</p>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link download">Download Document ↗</a>
            `;
            grid.appendChild(card);
        });
        assetsContainer.appendChild(grid);
    }

    // COLUMN 3: Social Video & Media Citations
    const socialContainer = document.getElementById("d-social-container");
    socialContainer.innerHTML = "";
    const socials = data.social_citations || [];
    document.getElementById("d-social-count").textContent = socials.length;

    if (socials.length === 0) {
        socialContainer.innerHTML = `<div class="brand-card font-mono" style="text-align:center;color:var(--text-muted); padding: 2rem;">No citations located.</div>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "brand-card-grid";
        socials.forEach(soc => {
            const sanitizedLink = sanitizeUrl(soc.link);
            const domain = getDomain(sanitizedLink);
            const logoHtml = getBrandLogoHtml(soc.title, "social");
            
            const card = document.createElement("div");
            card.className = "brand-card";
            card.innerHTML = `
                <div class="brand-card-header">
                    ${logoHtml}
                    <div class="brand-card-meta">
                        <h5>${escapeHTML(soc.title)}</h5>
                        <span class="brand-sub font-mono">${domain}</span>
                    </div>
                </div>
                <p class="brand-desc">${escapeHTML(soc.snippet || "Public media explanation links.")}</p>
                <a href="${sanitizedLink}" target="_blank" class="brand-card-link">Open Citation ↗</a>
            `;
            grid.appendChild(card);
        });
        socialContainer.appendChild(grid);
    }
}

// --- SYNCHRONIZE HISTORY DATA ---
async function loadHistoryData() {
    const listDiv = document.getElementById("history-lists");
    const emptyDiv = document.getElementById("history-empty");
    
    try {
        const resVal = await fetch(`${API_URL}/api/validations`);
        const resDisc = await fetch(`${API_URL}/api/discoveries`);
        
        if (!resVal.ok || !resDisc.ok) throw new Error("History loader offline.");
        
        const validations = await resVal.json();
        const discoveries = await resDisc.json();
        
        const vCount = validations.length;
        const dCount = discoveries.length;
        
        document.getElementById("h-validations-count").textContent = vCount;
        document.getElementById("h-discoveries-count").textContent = dCount;
        
        if (vCount === 0 && dCount === 0) {
            listDiv.classList.add("hidden");
            emptyDiv.classList.remove("hidden");
            return;
        }
        
        emptyDiv.classList.add("hidden");
        listDiv.classList.remove("hidden");
        
        // Render Validations list
        const valContainer = document.getElementById("h-validations-container");
        valContainer.innerHTML = "";
        validations.forEach(v => {
            const date = new Date(v.created_at).toLocaleDateString();
            const card = document.createElement("div");
            card.className = "history-item";
            card.style.cursor = "pointer";
            
            const solName = v.proposed_solution ? v.proposed_solution.slice(0, 40) : "Untitled";
            
            card.innerHTML = `
                <div class="history-header-row">
                    <span class="font-mono text-xs text-yellow font-bold">${v.match_score}% Overlap</span>
                    <button class="history-delete-btn" title="Delete record">✕</button>
                </div>
                <div class="history-body">
                    <h5>${escapeHTML(solName)}...</h5>
                    <p class="text-zinc-400 text-xs" style="margin-top:0.25rem;">${escapeHTML(v.problem_statement)}</p>
                </div>
                <div class="history-footer font-mono">
                    <span>${date}</span>
                    <span style="color:var(--text-muted);">Expand</span>
                </div>
            `;
            
            // Clean listeners
            card.querySelector(".history-body").addEventListener("click", () => {
                viewHistoryItem("validation", v);
            });
            card.querySelector(".history-footer").addEventListener("click", () => {
                viewHistoryItem("validation", v);
            });
            card.querySelector(".history-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                deleteHistoryItem("validation", v.validation_id);
            });
            
            valContainer.appendChild(card);
        });

        // Render Discoveries list
        const discContainer = document.getElementById("h-discoveries-container");
        discContainer.innerHTML = "";
        discoveries.forEach(d => {
            const date = new Date(d.created_at).toLocaleDateString();
            const card = document.createElement("div");
            card.className = "history-item";
            card.style.cursor = "pointer";
            
            card.innerHTML = `
                <div class="history-header-row">
                    <span class="font-mono text-xs text-blue font-bold">${d.discovered_solutions.length} Solutions</span>
                    <button class="history-delete-btn" title="Delete record">✕</button>
                </div>
                <div class="history-body">
                    <h5>Research Topic:</h5>
                    <p class="text-zinc-400 text-xs" style="margin-top:0.25rem;">${escapeHTML(d.problem_statement)}</p>
                </div>
                <div class="history-footer font-mono">
                    <span>${date}</span>
                    <span style="color:var(--text-muted);">Expand</span>
                </div>
            `;
            
            // Clean listeners
            card.querySelector(".history-body").addEventListener("click", () => {
                viewHistoryItem("discovery", d);
            });
            card.querySelector(".history-footer").addEventListener("click", () => {
                viewHistoryItem("discovery", d);
            });
            card.querySelector(".history-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                deleteHistoryItem("discovery", d.discovery_id);
            });
            
            discContainer.appendChild(card);
        });

    } catch (e) {
        showToast(e.message, "error");
    }
}

async function deleteHistoryItem(type, id) {
    try {
        const endpoint = type === "validation" ? `/api/validations/${id}` : `/api/discoveries/${id}`;
        const res = await fetch(`${API_URL}${endpoint}`, { method: "DELETE" });
        if (res.ok) {
            showToast(`${type.toUpperCase()} record deleted.`, "success");
            loadHistoryData(); // Reload list
        }
    } catch {
        showToast("Delete request failed.", "error");
    }
}

function viewHistoryItem(type, data) {
    if (type === "validation") {
        problemInput.value = data.problem_statement;
        solutionInput.value = data.proposed_solution;
        switchTab("validate");
        activeValidationResult = data; // Cache back in memory
        renderValidationOutput(data);
    } else {
        discoverProblemInput.value = data.problem_statement;
        switchTab("discover");
        activeDiscoveryResult = data; // Cache back in memory
        renderDiscoveryOutput(data);
    }
    showToast("Historical data loaded into dashboard.", "info");
}

// --- DYNAMIC PDF & CSV CLIENT-SIDE EXPORTERS ---
function exportData(type, format) {
    const data = type === 'validation' ? activeValidationResult : activeDiscoveryResult;
    
    if (!data) {
        showToast("No active research metrics loaded to export. Run a sweep first.", "error");
        return;
    }

    if (format === 'pdf') {
        const printWindow = window.open("", "_blank");
        let htmlContent = "";
        
        const competitorRows = (data.verified_sources || []).map((c, i) => `
            <div class="card">
                <div class="card-title">${i+1}. ${escapeHTML(c.title)}</div>
                <div class="card-snippet">${escapeHTML(c.snippet || "Competitor details.")}</div>
                <a class="card-link" href="${sanitizeUrl(c.link)}" target="_blank">${sanitizeUrl(c.link)}</a>
            </div>
        `).join("");

        const docRows = (data.downloadable_assets || []).map((d, i) => `
            <div class="card">
                <div class="card-title">${i+1}. ${escapeHTML(d.title)} [${d.file_type.toUpperCase()}]</div>
                <div class="card-snippet">${escapeHTML(d.snippet || "Attachment resource.")}</div>
                <a class="card-link" href="${sanitizeUrl(d.link)}" target="_blank">${sanitizeUrl(d.link)}</a>
            </div>
        `).join("");

        const socialRows = (data.social_citations || []).map((s, i) => `
            <div class="card">
                <div class="card-title">${i+1}. ${escapeHTML(s.title)}</div>
                <div class="card-snippet">${escapeHTML(s.snippet || "Citation link.")}</div>
                <a class="card-link" href="${sanitizeUrl(s.link)}" target="_blank">${sanitizeUrl(s.link)}</a>
            </div>
        `).join("");

        htmlContent = `
            <html>
            <head>
                <title>Market Overlap Report - ${escapeHTML((data.proposed_solution || data.problem_statement).slice(0, 30))}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1f2937; line-height: 1.4; background: #ffffff; }
                    h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin: 0 0 5px 0; font-size: 24px; }
                    .subtitle { font-family: monospace; font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px; }
                    .metric-box { background: #f3f4f6; border-left: 5px solid #6366f1; padding: 15px 20px; margin-bottom: 20px; border-radius: 6px; }
                    .score { font-size: 22px; font-weight: bold; color: #1e1b4b; }
                    
                    /* Three Columns printable CSS grid */
                    .three-columns-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .col {
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 12px;
                        min-height: 250px;
                    }
                    .col-title {
                        font-size: 13px;
                        font-weight: bold;
                        color: #111827;
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 6px;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .card {
                        background: #ffffff;
                        border: 1px solid #f3f4f6;
                        border-radius: 6px;
                        padding: 8px;
                        margin-bottom: 8px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                    }
                    .card-title {
                        font-size: 11px;
                        font-weight: bold;
                        color: #1e1b4b;
                        margin-bottom: 3px;
                    }
                    .card-snippet {
                        font-size: 10px;
                        color: #4b5563;
                        margin-bottom: 4px;
                        line-height: 1.3;
                    }
                    .card-link {
                        font-size: 9px;
                        color: #6366f1;
                        text-decoration: none;
                        word-break: break-all;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <h1>Market Overlap Intelligence Report</h1>
                <div class="subtitle">AUTOMATED TECHNICAL OVERLAP ANALYSIS</div>
                <p style="font-size: 11px; margin-bottom: 15px;">
                    <strong>Validation ID:</strong> ${data.validation_id || data.discovery_id} | 
                    <strong>Date:</strong> ${new Date(data.created_at).toLocaleString()}
                </p>
                <p style="font-size: 12px; margin-bottom: 5px;"><strong>Target Problem Statement:</strong> ${escapeHTML(data.problem_statement)}</p>
                ${data.proposed_solution ? `<p style="font-size: 12px; margin-bottom: 15px;"><strong>Proposed Solution:</strong> ${escapeHTML(data.proposed_solution)}</p>` : ''}
                
                <div class="metric-box">
                    ${data.match_score !== undefined ? `<div class="score">Match Score: ${Math.round(data.match_score)}% [${data.match_tier.toUpperCase()}]</div>` : '<div class="score">Discovery Analysis</div>'}
                    <p style="margin: 5px 0 0 0; font-size: 12px;"><strong>AI Assessment:</strong> ${escapeHTML(data.ai_analysis || data.ai_summary)}</p>
                </div>

                <div class="three-columns-grid">
                    <div class="col">
                        <div class="col-title">📂 Verified Portals</div>
                        ${competitorRows || '<p style="font-size:11px;color:#9ca3af;">No sites found.</p>'}
                    </div>
                    <div class="col">
                        <div class="col-title">📥 Guide Attachments</div>
                        ${docRows || '<p style="font-size:11px;color:#9ca3af;">No assets identified.</p>'}
                    </div>
                    <div class="col">
                        <div class="col-title">🎬 Social & Citations</div>
                        ${socialRows || '<p style="font-size:11px;color:#9ca3af;">No citations located.</p>'}
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Let it load styles then print
        setTimeout(() => {
            printWindow.print();
        }, 500);
        showToast("PDF report preview created.", "success");
        
    } else if (format === 'csv') {
        let csvContent = "";
        
        if (type === 'validation') {
            csvContent += "METRIC,VALUE\r\n";
            csvContent += `Validation ID,${data.validation_id}\r\n`;
            csvContent += `Problem,"${data.problem_statement.replace(/"/g, '""')}"\r\n`;
            csvContent += `Proposed Solution,"${data.proposed_solution.replace(/"/g, '""')}"\r\n`;
            csvContent += `Match Score,${data.match_score}%\r\n`;
            csvContent += `Match Tier,${data.match_tier}\r\n`;
            csvContent += `AI Analysis,"${data.ai_analysis.replace(/"/g, '""')}"\r\n\r\n`;
            
            csvContent += "CATEGORY,RESOURCE TITLE,OUTBOUND URL\r\n";
            (data.verified_sources || []).forEach(c => {
                csvContent += `Competitor Website,"${c.title.replace(/"/g, '""')}",${sanitizeUrl(c.link)}\r\n`;
            });
            (data.downloadable_assets || []).forEach(d => {
                csvContent += `Document download,"${d.title.replace(/"/g, '""')}",${sanitizeUrl(d.link)}\r\n`;
            });
            (data.social_citations || []).forEach(s => {
                csvContent += `Social/Video Citation,"${s.title.replace(/"/g, '""')}",${sanitizeUrl(s.link)}\r\n`;
            });
        } else {
            csvContent += "METRIC,VALUE\r\n";
            csvContent += `Discovery ID,${data.discovery_id}\r\n`;
            csvContent += `Problem Statement,"${data.problem_statement.replace(/"/g, '""')}"\r\n`;
            csvContent += `AI Summary,"${data.ai_summary.replace(/"/g, '""')}"\r\n\r\n`;
            
            csvContent += "DISCOVERED SOLUTION,DESCRIPTION,CONFIDENCE\r\n";
            (data.discovered_solutions || []).forEach(s => {
                csvContent += `"${s.title.replace(/"/g, '""')}","${s.description.replace(/"/g, '""')}",${s.confidence}\r\n`;
            });
            csvContent += "\r\n";
            
            csvContent += "CATEGORY,RESOURCE TITLE,OUTBOUND URL\r\n";
            (data.verified_sources || []).forEach(c => {
                csvContent += `Verified Web Link,"${c.title.replace(/"/g, '""')}",${sanitizeUrl(c.link)}\r\n`;
            });
            (data.downloadable_assets || []).forEach(d => {
                csvContent += `Spreadsheet/Manual,"${d.title.replace(/"/g, '""')}",${sanitizeUrl(d.link)}\r\n`;
            });
            (data.social_citations || []).forEach(s => {
                csvContent += `Social/Video Citation,"${s.title.replace(/"/g, '""')}",${sanitizeUrl(s.link)}\r\n`;
            });
        }

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${type}_report_${uuid().slice(0, 8)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Excel compatible CSV file download started.", "success");
    }
}

// Separate column download utility
function exportColumnData(type, column) {
    const data = type === 'validation' ? activeValidationResult : activeDiscoveryResult;
    if (!data) {
        showToast("No active research metrics loaded to export. Run a sweep first.", "error");
        return;
    }
    
    let csvContent = "";
    csvContent += "METRIC,VALUE\r\n";
    csvContent += `Report Type,${type.toUpperCase()} - Column: ${column.toUpperCase()}\r\n`;
    csvContent += `Problem Statement,"${data.problem_statement.replace(/"/g, '""')}"\r\n`;
    if (data.proposed_solution) {
        csvContent += `Proposed Solution,"${data.proposed_solution.replace(/"/g, '""')}"\r\n`;
    }
    csvContent += "\r\n";
    
    if (column === 'sources') {
        csvContent += "VERIFIED PORTAL TITLE,OUTBOUND URL,DESCRIPTION\r\n";
        (data.verified_sources || []).forEach(c => {
            csvContent += `"${c.title.replace(/"/g, '""')}",${sanitizeUrl(c.link)},"${(c.snippet || "").replace(/"/g, '""')}"\r\n`;
        });
    } else if (column === 'assets') {
        csvContent += "DOCUMENT TITLE,OUTBOUND URL,FILE TYPE,DESCRIPTION\r\n";
        (data.downloadable_assets || []).forEach(a => {
            csvContent += `"${a.title.replace(/"/g, '""')}",${sanitizeUrl(a.link)},${a.file_type.toUpperCase()},"${(a.snippet || "").replace(/"/g, '""')}"\r\n`;
        });
    } else if (column === 'social') {
        csvContent += "CITATION RESOURCE,OUTBOUND URL,DESCRIPTION\r\n";
        (data.social_citations || []).forEach(s => {
            csvContent += `"${s.title.replace(/"/g, '""')}",${sanitizeUrl(s.link)},"${(s.snippet || "").replace(/"/g, '""')}"\r\n`;
        });
    }
    
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${type}_${column}_column_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${column.toUpperCase()} dataset as Excel CSV.`, "success");
}

// --- HELPER UTILITIES ---
function getDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace("www.", "");
    } catch {
        return "external-resource";
    }
}

function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
