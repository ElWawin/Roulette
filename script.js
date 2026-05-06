// Default items for the roulette
const DEFAULT_ITEMS = [
    { name: 'Prize 1', color: '#FF6B6B', weight: 1 },
    { name: 'Prize 2', color: '#4ECDC4', weight: 1 },
    { name: 'Prize 3', color: '#FFE66D', weight: 1 },
    { name: 'Prize 4', color: '#95E1D3', weight: 1 },
    { name: 'Prize 5', color: '#F38181', weight: 1 },
    { name: 'Prize 6', color: '#AA96DA', weight: 1 },
];

let items = [];
let isSpinning = false;
let currentRotation = 0;
let soundEnabled = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    drawWheel();
    setupEventListeners();
    initAudio();
});

function setupEventListeners() {
    document.getElementById('speedSlider').addEventListener('change', (e) => {
        document.getElementById('speedValue').textContent = e.target.value;
    });

    document.getElementById('soundToggle').addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        document.getElementById('soundText').textContent = soundEnabled ? 'Sound ON' : 'Sound OFF';
    });

    document.getElementById('panelToggle').addEventListener('click', (e) => {
        const panel = document.querySelector('.panel-content');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isSpinning) {
            e.preventDefault();
            spin();
        }
    });
}

function loadItems() {
    const saved = localStorage.getItem('rouletteItems');
    items = saved ? JSON.parse(saved) : DEFAULT_ITEMS;
    renderItemsList();
}

function saveItems() {
    localStorage.setItem('rouletteItems', JSON.stringify(items));
}

function renderItemsList() {
    const list = document.getElementById('itemsList');
    list.innerHTML = items.map((item, idx) => `
        <div class="item-entry" style="border-left-color: ${item.color}">
            <div class="item-entry-color" style="background-color: ${item.color}"></div>
            <div class="item-entry-text">
                <div class="item-entry-name">${item.name}</div>
                <div class="item-entry-weight">Weight: ${item.weight}%</div>
            </div>
            <button class="btn-delete" onclick="deleteItem(${idx})">×</button>
        </div>
    `).join('');
    drawWheel();
}

function addItem() {
    const nameInput = document.getElementById('itemName');
    const colorInput = document.getElementById('itemColor');
    const weightInput = document.getElementById('itemWeight');

    if (!nameInput.value.trim()) {
        alert('Please enter an item name');
        return;
    }

    items.push({
        name: nameInput.value.trim(),
        color: colorInput.value,
        weight: parseInt(weightInput.value) || 1
    });

    nameInput.value = '';
    weightInput.value = '1';
    colorInput.value = '#FF6B6B';

    saveItems();
    renderItemsList();
    playClickSound();
}

function deleteItem(idx) {
    items.splice(idx, 1);
    if (items.length === 0) {
        items = DEFAULT_ITEMS;
    }
    saveItems();
    renderItemsList();
}

function resetToDefaults() {
    items = DEFAULT_ITEMS;
    saveItems();
    renderItemsList();
}

function clearAll() {
    if (confirm('Are you sure you want to clear all items?')) {
        items = DEFAULT_ITEMS;
        saveItems();
        renderItemsList();
    }
}

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    let currentAngle = 0;

    items.forEach((item, idx) => {
        const sliceAngle = (item.weight / totalWeight) * 2 * Math.PI;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, currentAngle, currentAngle + sliceAngle);
        ctx.lineTo(radius, radius);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(currentAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(item.name, radius - 20, 5);
        ctx.restore();

        currentAngle += sliceAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(radius, radius, 15, 0, 2 * Math.PI);
    ctx.fillStyle = 'gold';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function spin() {
    if (isSpinning || items.length === 0) return;

    isSpinning = true;
    document.getElementById('spinBtn').disabled = true;

    playSpinSound();

    const speed = parseInt(document.getElementById('speedSlider').value);
    const spins = speed + Math.random() * 10;
    const extraDegrees = Math.random() * 360;
    const finalRotation = spins * 360 + extraDegrees;

    const canvas = document.getElementById('wheelCanvas');
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    animateSpin(0, finalRotation, speed * 100, () => {
        currentRotation = (currentRotation + finalRotation) % 360;
        
        const winner = getWinner(currentRotation, totalWeight);
        
        playStopSound();
        createConfetti();
        showResult(winner);
        
        isSpinning = false;
        document.getElementById('spinBtn').disabled = false;
    });
}

function animateSpin(start, end, duration, callback) {
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing out (deceleration)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const rotation = start + (end - start) * easeProgress;

        const canvas = document.getElementById('wheelCanvas');
        canvas.style.transform = `rotate(${rotation}deg)`;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }

    requestAnimationFrame(animate);
}

function getWinner(rotation, totalWeight) {
    const normalizedRotation = (360 - rotation) % 360;
    let currentAngle = 0;

    for (let item of items) {
        const itemAngle = (item.weight / totalWeight) * 360;
        if (normalizedRotation >= currentAngle && normalizedRotation < currentAngle + itemAngle) {
            return item;
        }
        currentAngle += itemAngle;
    }

    return items[0];
}

function showResult(winner) {
    const display = document.getElementById('resultDisplay');
    document.getElementById('resultText').textContent = winner.name;
    document.getElementById('resultDisplay').style.backgroundColor = `${winner.color}80`;
    display.classList.remove('hidden');
}

function closeResult() {
    document.getElementById('resultDisplay').classList.add('hidden');
}

function createConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = items.map(i => i.color);

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.background = color;
        
        const startX = Math.random() * window.innerWidth;
        const startY = -10;
        
        const tx = (Math.random() - 0.5) * 200;
        const ty = window.innerHeight + 10;
        
        confetti.style.left = startX + 'px';
        confetti.style.top = startY + 'px';
        confetti.style.setProperty('--tx', tx + 'px');
        confetti.style.setProperty('--ty', ty + 'px');
        
        const delay = Math.random() * 0.2;
        confetti.style.animationDelay = delay + 's';
        
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3200);
    }
}

// Audio Functions
function initAudio() {
    // Create spin sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // You can add actual audio files or generate tones
    // For now, we'll create simple beep sounds programmatically
}

function playSpinSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not available');
    }
}

function playStopSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not available');
    }
}

function playClickSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {
        console.log('Audio not available');
    }
}
