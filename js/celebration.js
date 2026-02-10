// Sistema de celebración al agregar productos al carrito
// Fuegos artificiales, confetti, explosiones de alegría

function createCelebration() {
    // Crear contenedor de celebración
    const celebrationContainer = document.createElement('div');
    celebrationContainer.className = 'celebration-container';
    celebrationContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 99999;
    `;
    document.body.appendChild(celebrationContainer);

    // Colores vibrantes para la celebración
    const colors = ['#4caf50', '#66bb6a', '#ffd54b', '#ff9800', '#e53935', '#2196f3', '#9c27b0', '#00bcd4'];
    
    // Crear confetti
    for (let i = 0; i < 100; i++) {
        createConfetti(celebrationContainer, colors);
    }
    
    // Crear fuegos artificiales
    createFireworks(celebrationContainer, colors);
    
    // Crear emojis flotantes
    createFloatingEmojis(celebrationContainer);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        celebrationContainer.style.opacity = '0';
        celebrationContainer.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            celebrationContainer.remove();
        }, 500);
    }, 3000);
}

function createConfetti(container, colors) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const startX = Math.random() * 100;
    const startY = -10;
    const rotation = Math.random() * 360;
    const duration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;
    
    confetti.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${startX}%;
        top: ${startY}%;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        transform: rotate(${rotation}deg);
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
        box-shadow: 0 0 6px ${color};
    `;
    
    container.appendChild(confetti);
}

function createFireworks(container, colors) {
    const positions = [
        { x: 20, y: 30 },
        { x: 50, y: 25 },
        { x: 80, y: 30 },
        { x: 35, y: 40 },
        { x: 65, y: 40 }
    ];
    
    positions.forEach((pos, index) => {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.cssText = `
                position: absolute;
                left: ${pos.x}%;
                top: ${pos.y}%;
                width: 4px;
                height: 4px;
                background: ${colors[index % colors.length]};
                border-radius: 50%;
                animation: fireworkExplode 1s ease-out forwards;
            `;
            container.appendChild(firework);
            
            // Crear partículas de explosión
            for (let i = 0; i < 20; i++) {
                createFireworkParticle(container, pos.x, pos.y, colors[index % colors.length]);
            }
        }, index * 200);
    });
}

function createFireworkParticle(container, x, y, color) {
    const particle = document.createElement('div');
    const angle = (Math.PI * 2 * Math.random());
    const velocity = Math.random() * 100 + 50;
    const distance = Math.random() * 150 + 100;
    
    particle.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: 6px;
        height: 6px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color};
        animation: fireworkParticle 1s ease-out forwards;
        --angle: ${angle}rad;
        --velocity: ${velocity}px;
        --distance: ${distance}px;
    `;
    
    container.appendChild(particle);
}

function createFloatingEmojis(container) {
    const emojis = ['🎉', '✨', '🛒', '⭐', '💚', '🎊', '🔥', '💫'];
    const positions = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    
    positions.forEach((x, index) => {
        const emoji = document.createElement('div');
        emoji.textContent = emojis[index % emojis.length];
        emoji.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: 50%;
            font-size: ${Math.random() * 30 + 40}px;
            animation: floatEmoji 2s ease-out ${index * 0.1}s forwards;
            transform: translateY(-50%);
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        `;
        container.appendChild(emoji);
    });
}

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
        }
    }
    
    @keyframes fireworkExplode {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(20);
            opacity: 0;
        }
    }
    
    @keyframes fireworkParticle {
        0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(
                calc(cos(var(--angle)) * var(--distance)),
                calc(sin(var(--angle)) * var(--distance))
            ) scale(0);
            opacity: 0;
        }
    }
    
    @keyframes floatEmoji {
        0% {
            transform: translateY(-50%) scale(0) rotate(0deg);
            opacity: 0;
        }
        20% {
            opacity: 1;
        }
        100% {
            transform: translateY(-150vh) scale(1.5) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Hacer función disponible globalmente
window.createCelebration = createCelebration;
