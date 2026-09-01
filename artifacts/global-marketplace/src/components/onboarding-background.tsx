const ONBOARD_BG_IMAGES = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80',
  'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=600&q=80',
  'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&q=80',
];

const BG_ANIMATIONS = `
  @keyframes ob-float1 {
    0%, 100% { transform: translateZ(0) rotateX(8deg) rotateY(-6deg) translateY(0); }
    33% { transform: translateZ(60px) rotateX(-4deg) rotateY(10deg) translateY(-30px); }
    66% { transform: translateZ(30px) rotateX(6deg) rotateY(-8deg) translateY(-15px); }
  }
  @keyframes ob-float2 {
    0%, 100% { transform: translateZ(0) rotateX(-5deg) rotateY(8deg) translateY(0); }
    33% { transform: translateZ(45px) rotateX(7deg) rotateY(-5deg) translateY(-25px); }
    66% { transform: translateZ(70px) rotateX(-3deg) rotateY(4deg) translateY(-10px); }
  }
  @keyframes ob-float3 {
    0%, 100% { transform: translateZ(0) rotateX(6deg) rotateY(-7deg) translateY(0); }
    33% { transform: translateZ(55px) rotateX(-6deg) rotateY(6deg) translateY(-20px); }
    66% { transform: translateZ(20px) rotateX(4deg) rotateY(-4deg) translateY(-35px); }
  }
  @keyframes ob-float4 {
    0%, 100% { transform: translateZ(0) rotateX(-8deg) rotateY(5deg) translateY(0); }
    33% { transform: translateZ(40px) rotateX(5deg) rotateY(-9deg) translateY(-15px); }
    66% { transform: translateZ(65px) rotateX(-7deg) rotateY(3deg) translateY(-28px); }
  }
  @keyframes ob-pulse {
    0%, 100% { opacity: 0.12; }
    50% { opacity: 0.22; }
  }
`;

export function OnboardingBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ perspective: '900px', perspectiveOrigin: '50% 50%' }}>
      <style>{BG_ANIMATIONS}</style>
      {ONBOARD_BG_IMAGES.map((img, i) => (
        <div
          key={i}
          className="absolute rounded-2xl overflow-hidden"
          style={{
            width: `${150 + (i % 3) * 55}px`,
            height: `${150 + (i % 3) * 55}px`,
            left: `${(i * 16 + 3) % 80}%`,
            top: `${(i * 19 + 7) % 80}%`,
            animation: `ob-float${(i % 4) + 1} ${13 + i * 2}s ease-in-out infinite, ob-pulse ${8 + i * 1.5}s ease-in-out infinite`,
            animationDelay: `${i * -1.5}s`,
            opacity: 0.15,
            transformStyle: 'preserve-3d',
            boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
          }}
        >
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
