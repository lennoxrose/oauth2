// API Configuration - loaded from server
let API_BASE = null;
let APP_DOMAIN = null;

// Load configuration from server
async function loadConfig() {
	try {
		const response = await fetch('/oauth2/config.php');
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to load configuration');
		}
		const config = await response.json();
		API_BASE = config.api_base;
		APP_DOMAIN = config.app_domain;
		console.log('Config loaded:', config);
		return config;
	} catch (error) {
		console.error('Configuration error:', error);
		showError('Configuration error: ' + error.message);
		throw error;
	}
}

// Initialize reveal animations
function initReveal() {
	const els = Array.from(document.querySelectorAll('.reveal'));
	if (!('IntersectionObserver' in window) || els.length === 0) {
		els.forEach(el => {
			el.style.opacity = '1';
			el.style.transform = 'none';
		});
		return;
	}
	const io = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.style.opacity = '1';
				entry.target.style.transform = 'none';
				io.unobserve(entry.target);
			}
		});
	}, { threshold: 0.15 });
	els.forEach(el => io.observe(el));
}

// Set current year
function setYear() {
	const yearEl = document.getElementById('year');
	if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// Handle verification button click
function initVerifyButton() {
	const btn = document.getElementById('verify-button');
	if (!btn) return;

	btn.addEventListener('click', () => {
		// Redirect to API OAuth endpoint
		window.location.href = `${API_BASE}/auth`;
	});
}

// Check for callback URL parameters
function checkCallback() {
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');
	const error = params.get('error');

	if (error) {
		showError(error);
		return;
	}

	if (code) {
		// We're on the callback page, show loading
		showLoading();
	}
}

// Show loading state
function showLoading() {
	const verifySection = document.getElementById('verify-section');
	const successSection = document.getElementById('success-section');
	
	if (verifySection) verifySection.classList.add('hidden');
	if (successSection) {
		successSection.classList.remove('hidden');
		successSection.innerHTML = `
			<section class="text-center fade-in">
				<div class="inline-flex items-center justify-center w-24 h-24 mb-6 border border-white/10 bg-black/40">
					<div class="loading">
						<svg class="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
				</div>
				<h1 class="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white mb-4">
					Verifying <span class="text-accent">Account...</span>
				</h1>
				<p class="text-gray-300">Please wait while we process your verification</p>
			</section>
		`;
	}
}

// Show success with user info
function showSuccess(userData) {
	const successSection = document.getElementById('success-section');
	if (!successSection) return;

	successSection.classList.remove('hidden');
	
	const avatar = userData.avatar 
		? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
		: `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator) % 5}.png`;

	successSection.innerHTML = `
		<section class="text-center fade-in">
			<div class="inline-flex items-center justify-center w-24 h-24 mb-6 border border-white/10 bg-black/40">
				<span class="text-5xl">✅</span>
			</div>
			
			<h1 class="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white mb-4">
				Verification <span class="text-accent">Successful!</span>
			</h1>
			
			<div class="mt-8 border border-white/10 p-6">
				<h2 class="text-xl font-bold text-white mb-4">Your Account</h2>
				<div class="flex items-center gap-4 justify-center">
					<img src="${avatar}" class="w-16 h-16 border border-white/10" alt="User Avatar">
					<div class="text-left">
						<p class="text-white font-semibold">${userData.username}${userData.discriminator !== '0' ? '#' + userData.discriminator : ''}</p>
						<p class="text-gray-400 text-sm">ID: ${userData.id}</p>
					</div>
				</div>
			</div>

			<p class="mt-6 text-gray-300">
				You can now close this page and return to Discord.
			</p>
		</section>
	`;
}

// Show error
function showError(error) {
	const verifySection = document.getElementById('verify-section');
	const successSection = document.getElementById('success-section');
	
	if (verifySection) verifySection.classList.add('hidden');
	if (successSection) {
		successSection.classList.remove('hidden');
		successSection.innerHTML = `
			<section class="text-center fade-in">
				<div class="inline-flex items-center justify-center w-24 h-24 mb-6 border border-white/10 bg-black/40">
					<span class="text-5xl">❌</span>
				</div>
				
				<h1 class="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white mb-4">
					Verification <span class="text-red-400">Failed</span>
				</h1>
				
				<div class="mt-8 border border-red-500/20 p-6 bg-red-500/5">
					<p class="text-red-400">${error}</p>
				</div>

				<button onclick="window.location.href='/'" class="mt-6 px-8 py-4 bg-accent text-black font-semibold border border-accent hover:bg-transparent hover:text-accent transition-colors">
					Try Again
				</button>
			</section>
		`;
	}
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
	await loadConfig(); // Load config first
	initReveal();
	setYear();
	initVerifyButton();
	checkCallback();
});
