import { useState } from 'react';
import { ArrowRight, BookOpen, Cloud, Lock, Sparkles, Layers, Search, Cpu, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

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
    const t = translations[lang];

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
        { icon: Layers, title: t.feat1Title, desc: t.feat1Desc },
        { icon: BookOpen, title: t.feat2Title, desc: t.feat2Desc },
        { icon: Cloud, title: t.feat3Title, desc: t.feat3Desc },
        { icon: Lock, title: t.feat4Title, desc: t.feat4Desc },
        { icon: Cpu, title: t.feat5Title, desc: t.feat5Desc },
        { icon: Search, title: t.feat6Title, desc: t.feat6Desc }
    ];

    return (
        <div className="h-screen w-full bg-background text-foreground selection:bg-neutral-800 font-sans overflow-y-auto overflow-x-hidden relative dark">
            {/* Background Glows (Subtle Monochrome) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 w-[600px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2.5">
                    <img src="/icon_cropped.png" alt="Closure Logo" className="w-5 h-5 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0" />
                    <span className="text-2xl font-semibold tracking-tight text-foreground lowercase" style={{ fontFamily: "'Playfair Display', serif" }}>closure</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={toggleLanguage} className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-foreground transition-colors group w-16">
                        <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform shrink-0" />
                        <span className="block group-hover:hidden">{t.langShort}</span>
                        <span className="hidden group-hover:block">{t.langFull}</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <a href="/login" onClick={(e) => navigate(e, '/login')} className="text-sm font-medium text-neutral-400 hover:text-foreground transition-colors">
                            {t.loginBtn}
                        </a>
                        <Button asChild className="bg-white/90 text-black hover:bg-white transition-colors rounded-[6px]">
                            <a href="/register" onClick={(e) => navigate(e, '/register')}>{t.registerBtn}</a>
                        </Button>
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
                <div className="mt-20 relative w-full max-w-7xl mx-auto perspective-[2000px]">
                    <div className="relative transform-gpu rotate-x-[2deg] scale-[0.98] hover:scale-100 transition-transform duration-700 ease-out z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl">
                        <img src="/mockup.avif" alt="App Preview" className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl" />
                    </div>
                    {/* Glow behind mockup */}
                    <div className="absolute -inset-4 bg-white/5 blur-2xl -z-10 rounded-[3rem] opacity-50 pointer-events-none" />
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-32 px-4 bg-background">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2
                            className="text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground leading-[1.1]"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                            dangerouslySetInnerHTML={{ __html: t.featSectionTitle }}
                        />
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">{t.featSectionSub}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-card border border-border hover:border-neutral-700 transition-colors group">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <feature.icon className="w-6 h-6 text-neutral-300" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
                            </div>
                        ))}
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
