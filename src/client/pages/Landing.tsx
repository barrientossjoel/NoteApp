import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Cloud, Sparkles, Search, Globe, FileText, Workflow, Command, Lock, Cpu, Terminal, Layers } from 'lucide-react';
import { Button } from '../components/ui/button';
import { InteractiveCanvasMockup } from './landing/components/InteractiveCanvasMockup';
import { InteractiveMarkdownMockup } from './landing/components/InteractiveMarkdownMockup';
import { InteractiveSearchMockup } from './landing/components/InteractiveSearchMockup';

const translations = {
    en: {
        badge: "The next generation of thought organization",
        heroP1: "Your Mind,",
        heroP2: "Uncluttered and Connected.",
        heroSub: "A local-first ecosystem where all your ideas co-exist, designed as a natural extension of your mind. A personal library to capture and structure your thoughts anytime, from any device. Fully adaptable to your workflow.",
        startBtn: "Start Computing",
        exploreBtn: "Explore Features",
        loginBtn: "Log In",
        registerBtn: "Get Started",
        featSectionTitle: "Designed for Focus. <br /> Built for Speed.",
        featSectionSub: "Everything you need to capture, connect, and synthesize your knowledge in an environment that stays out of your way.",
        feat1Title: "Infinite Canvas",
        feat1Desc: "Break out of linear documents. Visually map your thoughts, connect ideas, and see the big picture.",
        feat2Title: "Powerful Markdown",
        feat2Desc: "Write at the speed of thought. Full support for GitHub-flavored markdown, tables, and task lists.",
        feat3Title: "Seamless Sync",
        feat3Desc: "Your notes are always within reach. Instantly synchronized across all your devices securely.",
        feat4Title: "Privacy First",
        feat4Desc: "Your data is yours. Local-first architecture ensures you have access even offline.",
        feat5Title: "Lightning Fast",
        feat5Desc: "Built on modern web technologies to be instantaneous. No loading spinners, no waiting.",
        feat6Title: "Instant Search",
        feat6Desc: "Find exactly what you're looking for with robust, full-text search across your entire vault.",
        ctaTitle: "Ready to declutter your mind?",
        ctaDesc: "Join thousands of users organizing their thoughts with Closure today.",
        ctaBtn: "Get Started for Free",
        rights: "All rights reserved.",
        langShort: "Esp",
        langFull: "Español",
        privacy: "Privacy",
        terms: "Terms",
        contact: "Contact"
    },
    es: {
        badge: "La nueva generación en organización de ideas",
        heroP1: "Tu Mente,",
        heroP2: "Despejada y Conectada.",
        heroSub: "Un ecosistema local-first donde coexisten todas tus ideas, diseñado como una extensión natural de tu mente. Una biblioteca personal para capturar y estructurar tus pensamientos en cualquier momento y desde cualquier dispositivo. Completamente adaptable a tu flujo de trabajo.",
        startBtn: "Empezar a Crear",
        exploreBtn: "Explorar Funciones",
        loginBtn: "Iniciar Sesión",
        registerBtn: "Comenzar",
        featSectionTitle: "Diseñado para Enfocarse. <br /> Construido para la Velocidad.",
        featSectionSub: "Todo lo que necesitas para capturar, conectar y sintetizar tu conocimiento en un entorno que no te estorba.",
        feat1Title: "Lienzo Infinito",
        feat1Desc: "Sal de los documentos lineales. Mapea visualmente tus pensamientos, conecta ideas y mira el panorama completo.",
        feat2Title: "Markdown Potente",
        feat2Desc: "Escribe a la velocidad del pensamiento. Soporte completo para markdown estilo GitHub, tablas y listas de tareas.",
        feat3Title: "Sincronización Transparente",
        feat3Desc: "Tus notas siempre a tu alcance. Sincronizadas instantáneamente en todos tus dispositivos de forma segura.",
        feat4Title: "Privacidad Primero",
        feat4Desc: "Tus datos son tuyos. La arquitectura local asegura que tengas acceso incluso sin conexión.",
        feat5Title: "Súper Rápido",
        feat5Desc: "Construido con tecnologías web modernas para ser instantáneo. Sin pantallas de carga, sin esperas.",
        feat6Title: "Búsqueda Instantánea",
        feat6Desc: "Encuentra exactamente lo que buscas con una potente búsqueda en todo el texto de tu bóveda.",
        ctaTitle: "¿Listo para ordenar tu mente?",
        ctaDesc: "Únete a miles de usuarios que ya organizan sus ideas con Closure hoy.",
        ctaBtn: "Comenzar Gratis",
        rights: "Todos los derechos reservados.",
        langShort: "Eng",
        langFull: "English",
        privacy: "Privacidad",
        terms: "Términos",
        contact: "Contacto"
    }
};

export default function Landing() {
    const [lang, setLang] = useState<'en' | 'es'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('closure_lang') as 'en' | 'es') || 'en';
        }
        return 'en';
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mockupRef = useRef<HTMLDivElement>(null);
    const t = translations[lang];

    const handleScroll = () => {
        if (!mockupRef.current || typeof window === 'undefined') return;
        const rect = mockupRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        const startPoint = windowHeight - 50; // Start animating slightly before it enters
        const endPoint = windowHeight * 0.4;  // Fully visible when it's 40% up the screen
        
        let progress = (startPoint - rect.top) / (startPoint - endPoint);
        progress = Math.max(0, Math.min(1, progress));
        
        mockupRef.current.style.opacity = progress.toString();
        mockupRef.current.style.transform = `translateY(${100 - progress * 100}px) scale(${0.9 + progress * 0.1}) rotateX(${(1 - progress) * 15}deg)`;
    };

    useEffect(() => {
        handleScroll(); // Initial check on mount
    }, []);

    const toggleLanguage = () => {
        setLang(prev => {
            const next = prev === 'en' ? 'es' : 'en';
            if (typeof window !== 'undefined') {
                localStorage.setItem('closure_lang', next);
            }
            return next;
        });
    };

    const navigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const features = [
        { icon: Cloud, title: t.feat3Title, desc: t.feat3Desc },
        { icon: Lock, title: t.feat4Title, desc: t.feat4Desc },
        { icon: Cpu, title: t.feat5Title, desc: t.feat5Desc }
    ];

    return (
        <div 
            className="h-screen w-full bg-background text-foreground selection:bg-neutral-800 font-sans overflow-y-auto overflow-x-hidden relative dark"
            onScroll={handleScroll}
        >
            {/* Background Glows (Subtle Monochrome) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute top-1/2 left-1/4 w-[600px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none -z-10" />
            
            {/* Light Beam from Top-Left (Logo area) */}
            <div className="absolute top-0 left-[10%] w-[1000px] h-[1500px] bg-gradient-to-br from-white/[0.15] via-white/[0.03] to-transparent -rotate-45 origin-top-left blur-[80px] pointer-events-none z-0" />

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2.5">
                    <img src="/icon_cropped.png" alt="Closure Logo" className="w-5 h-5 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0" />
                    <span className="text-2xl font-semibold tracking-tight text-foreground lowercase" style={{ fontFamily: "'Playfair Display', serif" }}>closure</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    <button aria-label="Toggle language" onClick={toggleLanguage} className="flex items-center justify-center text-neutral-400 hover:text-foreground transition-colors group">
                        <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform shrink-0" />
                    </button>
                    <div className="flex items-center gap-4">
                        <a href="/login" onClick={(e) => navigate(e, '/login')} className="text-sm font-medium text-neutral-400 hover:text-foreground transition-colors whitespace-nowrap">
                            {t.loginBtn}
                        </a>
                        <Button asChild className="bg-white/90 text-black hover:bg-white transition-colors rounded-[6px]">
                            <a href="/register" onClick={(e) => navigate(e, '/register')}>{t.registerBtn}</a>
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden flex items-center">
                    <div className="relative">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-neutral-400 hover:text-foreground transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>

                        {mobileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-400 hover:text-foreground hover:bg-white/5 transition-colors">
                                        <Globe className="w-4 h-4" />
                                        <span>{t.langFull}</span>
                                    </button>
                                    <a href="/login" onClick={(e) => { navigate(e, '/login'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-2 text-sm text-neutral-400 hover:text-foreground hover:bg-white/5 transition-colors">
                                        {t.loginBtn}
                                    </a>
                                    <div className="px-4 py-2">
                                        <Button asChild className="w-full bg-white/90 text-black hover:bg-white transition-colors rounded-[6px]">
                                            <a href="/register" onClick={(e) => { navigate(e, '/register'); setMobileMenuOpen(false); }}>{t.registerBtn}</a>
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-24 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-300 mb-8 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>{t.badge}</span>
                </div>

                <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');`}</style>
                <h1 className="text-[54px] md:text-[84px] lg:text-[112px] font-medium tracking-tight max-w-5xl mx-auto text-foreground mb-8 leading-[0.9]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {t.heroP1} <br className="hidden md:block" /> <span className="italic font-normal">{t.heroP2}</span>
                </h1>

                <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    {t.heroSub}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button asChild size="lg" className="bg-white/90 text-black hover:bg-white hover:text-black rounded-[8px]">
                        <a href="/register" onClick={(e) => navigate(e, '/register')}>
                            {t.startBtn}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </a>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="border-white/10 bg-black/50 hover:bg-white/5 text-white backdrop-blur-sm rounded-[8px]">
                        <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>{t.exploreBtn}</a>
                    </Button>
                </div>

                {/* Hero App Preview */}
                <div 
                    ref={mockupRef}
                    className="mt-20 relative w-full max-w-7xl mx-auto perspective-[2000px] will-change-transform"
                    style={{ opacity: 0, transform: 'translateY(100px) scale(0.9) rotateX(15deg)' }}
                >
                    <div className="relative transform-gpu transition-transform duration-700 ease-out z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl hover:scale-[1.02]">
                        <img src="/mockup.avif" alt="App Preview" className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl" />
                    </div>
                    {/* Glow behind mockup */}
                    <div className="absolute -top-[5%] left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-white/30 blur-[120px] rounded-[100%] -z-10 pointer-events-none" />
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-32 px-4 bg-background">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-32">
                        <h2
                            className="text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground leading-[1.1]"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                            dangerouslySetInnerHTML={{ __html: t.featSectionTitle }}
                        />
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">{t.featSectionSub}</p>
                    </div>

                    {/* Main Features with Mockups */}
                    <div className="flex flex-col gap-32 mb-32">
                        {/* Feature 1: Canvas */}
                        <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
                            <div className="w-full md:w-5/12 space-y-5">
                                <div className="flex items-center gap-2 text-neutral-400 text-[13px] font-medium tracking-wide">
                                    <Workflow className="w-3.5 h-3.5" />
                                    <span>Visual Mapping</span>
                                </div>
                                <h3 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-white leading-[1.15]">{t.feat1Title}</h3>
                                <p className="text-[17px] text-neutral-400 leading-[1.6]">{t.feat1Desc}</p>
                            </div>
                            <div className="w-full md:w-7/12">
                                <div className="relative rounded-2xl border border-white/[0.03] bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group h-[400px]">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50 transition-opacity group-hover:opacity-100 duration-700" />
                                    <InteractiveCanvasMockup />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Feature 2: Editor (Image Left) */}
                        <div className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-24 pt-10">
                            <div className="w-full md:w-5/12 space-y-5">
                                <div className="flex items-center gap-2 text-neutral-400 text-[13px] font-medium tracking-wide">
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Modern Editor</span>
                                </div>
                                <h3 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-white leading-[1.15]">{t.feat2Title}</h3>
                                <p className="text-[17px] text-neutral-400 leading-[1.6]">{t.feat2Desc}</p>
                            </div>
                            <div className="w-full md:w-7/12">
                                <div className="relative rounded-2xl border border-white/[0.03] bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group h-[400px]">
                                    <InteractiveMarkdownMockup />
                                </div>
                            </div>
                        </div>

                        {/* Feature 3: Search (Vertical Layout) */}
                        <div className="flex flex-col items-center gap-12 pt-20">
                            <div className="w-full max-w-4xl relative rounded-2xl border border-white/[0.03] bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                                <InteractiveSearchMockup />
                            </div>
                            <div className="w-full max-w-2xl text-center space-y-5">
                                <div className="flex items-center justify-center gap-2 text-neutral-400 text-[13px] font-medium tracking-wide">
                                    <Command className="w-3.5 h-3.5" />
                                    <span>Global Search</span>
                                </div>
                                <h3 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-white leading-[1.15]">{t.feat6Title}</h3>
                                <p className="text-[17px] text-neutral-400 leading-[1.6] max-w-lg mx-auto">{t.feat6Desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Under the hood features */}
                    <div className="grid md:grid-cols-3 gap-6 pt-20 border-t border-white/10">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="p-8 rounded-2xl bg-card border border-border hover:border-neutral-700 transition-colors group">
                                    <Icon className="w-8 h-8 text-white mb-6" />
                                    <h3 className="text-xl font-semibold font-serif mb-3 text-foreground">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Bottom CTA Section */}
            <section className="relative z-10 py-32 px-4 bg-background border-t border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground leading-[1.1]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {t.ctaTitle}
                    </h2>
                    <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t.ctaDesc}
                    </p>
                    <Button asChild size="lg" className="bg-white/90 text-black hover:bg-white hover:text-black rounded-[8px] px-8 h-14 text-lg">
                        <a href="/register" onClick={(e) => navigate(e, '/register')}>
                            {t.ctaBtn}
                            <ArrowRight className="ml-2 w-5 h-5 -mt-0.5" />
                        </a>
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-border bg-background">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/icon_cropped.png" alt="Closure Logo" className="w-4 h-4 object-contain" />
                        <span className="text-xl font-semibold tracking-tight text-foreground lowercase" style={{ fontFamily: "'Playfair Display', serif" }}>closure</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © {new Date().getFullYear()} Closure. {t.rights}
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.privacy}</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.terms}</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.contact}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
