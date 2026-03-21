import { useState } from 'react';
import { ArrowRight, Cloud, Sparkles, Search, Globe, FileText, Workflow, Command, Lock, Cpu, Terminal, Layers } from 'lucide-react';
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
        { icon: Cloud, title: t.feat3Title, desc: t.feat3Desc },
        { icon: Lock, title: t.feat4Title, desc: t.feat4Desc },
        { icon: Cpu, title: t.feat5Title, desc: t.feat5Desc }
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
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="w-full md:w-5/12 space-y-6">
                                <Workflow className="w-8 h-8 text-white" />
                                <h3 className="text-3xl font-bold font-serif text-foreground">{t.feat1Title}</h3>
                                <p className="text-lg text-neutral-400 leading-relaxed">{t.feat1Desc}</p>
                            </div>
                            <div className="w-full md:w-7/12">
                                <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden group h-[350px]">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50 transition-opacity group-hover:opacity-100 duration-700" />

                                    <div className="w-full h-full relative group-hover:scale-[1.02] transition-transform duration-700">
                                        {/* Canvas Node 1 */}
                                        <div className="absolute top-10 left-8 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl font-sans text-sm z-10">
                                            <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 bg-white/5 font-medium text-neutral-200">
                                                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Core Concept
                                            </div>
                                            <div className="p-3 text-neutral-400 text-xs">
                                                NoteApp features a completely block-based canvas.
                                            </div>
                                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full border border-[#1e1e1e]"></div>
                                        </div>

                                        {/* SVG Connections */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                            <path d="M 224 85 C 280 85, 280 145, 310 145" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                                            <path d="M 224 85 C 260 85, 260 225, 340 225" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
                                        </svg>

                                        {/* Canvas Node 2 */}
                                        <div className="absolute top-28 left-[310px] w-40 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl font-sans text-sm z-10">
                                            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full border border-[#1e1e1e]"></div>
                                            <div className="px-3 py-2 flex items-center gap-2 bg-white/5 font-medium text-neutral-200">
                                                <Cloud className="w-3.5 h-3.5 text-sky-400" /> Synced Data
                                            </div>
                                        </div>

                                        {/* Canvas Node 3 */}
                                        <div className="absolute top-48 left-[340px] w-44 bg-[#1e1e1e] border border-[#8ab4f8]/30 rounded-lg shadow-[0_0_15px_rgba(138,180,248,0.1)] font-sans text-sm z-10">
                                            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#8ab4f8] rounded-full border border-[#1e1e1e]"></div>
                                            <div className="px-3 py-2 border-b border-[#8ab4f8]/20 flex items-center gap-2 bg-[#8ab4f8]/10 font-medium text-[#8ab4f8]">
                                                <Lock className="w-3.5 h-3.5" /> E2E Encryption
                                            </div>
                                            <div className="p-3 text-neutral-300 text-xs">
                                                Zero-knowledge payload wrapping.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Feature 2: Editor (Image Left) */}
                        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                            <div className="w-full md:w-5/12 space-y-6 md:pl-8">
                                <Terminal className="w-8 h-8 text-white" />
                                <h3 className="text-3xl font-bold font-serif text-foreground">{t.feat2Title}</h3>
                                <p className="text-lg text-neutral-400 leading-relaxed">{t.feat2Desc}</p>
                            </div>
                            <div className="w-full md:w-7/12">
                                <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden group h-[350px]">
                                    <div className="w-full h-full flex p-6 gap-6 font-mono text-sm group-hover:scale-[1.02] transition-transform duration-700">
                                        <div className="w-1/3 hidden sm:flex flex-col gap-3 opacity-60 border-r border-white/10 pr-6 pt-2">
                                            <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-2 rounded-md"><FileText className="w-4 h-4" /> <span>architecture.md</span></div>
                                            <div className="flex items-center gap-2 text-neutral-400 px-3 py-2"><FileText className="w-4 h-4" /> <span>roadmap.md</span></div>
                                            <div className="flex items-center gap-2 text-neutral-400 px-3 py-2"><FileText className="w-4 h-4" /> <span>ideas.md</span></div>
                                        </div>
                                        <div className="flex-1 pt-2">
                                            <div className="text-blue-400 text-xl font-bold mb-4"># Thought Process</div>
                                            <div className="text-neutral-300 mb-6 leading-relaxed">
                                                The key to <span className="text-orange-300">**productivity**</span> isn't finding more time, but using time with <span className="italic text-emerald-300">*clarity*</span>.
                                            </div>
                                            <div className="bg-black/40 border border-white/5 p-4 rounded-lg text-neutral-400 mb-6">
                                                <span className="text-pink-400">function</span> <span className="text-yellow-200">think</span>() {'{'} <br />
                                                &nbsp;&nbsp;<span className="text-pink-400">return</span> <span className="text-green-300">"clarity"</span>; <br />
                                                {'}'}
                                            </div>
                                            <div className="flex items-center gap-3 text-neutral-300 mb-2"><div className="w-4 h-4 border border-white/30 rounded flex items-center justify-center"><div className="w-2 h-2 bg-emerald-400 rounded-sm"></div></div> Capture tasks instantly</div>
                                            <div className="flex items-center gap-3 text-neutral-600 line-through"><div className="w-4 h-4 border border-white/10 rounded"></div> Forget ideas</div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Feature 3: Search */}
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="w-full md:w-5/12 space-y-6">
                                <Command className="w-8 h-8 text-white" />
                                <h3 className="text-3xl font-bold font-serif text-foreground">{t.feat6Title}</h3>
                                <p className="text-lg text-neutral-400 leading-relaxed">{t.feat6Desc}</p>
                            </div>
                            <div className="w-full md:w-7/12">
                                <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl font-sans group overflow-hidden h-[350px] flex flex-col transition-transform duration-700 hover:scale-[1.02]">
                                    <div className="p-4 pb-0">
                                        <div className="flex items-center px-4 h-[46px] rounded-lg border border-white/10 bg-black/20 text-[14px]">
                                            <Search className="w-4 h-4 mr-3 text-muted-foreground" />
                                            <span className="text-muted-foreground/50">Search notes, tags, or commands... (⌘B)</span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4 flex-1">
                                        <div>
                                            <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">NOTES</div>
                                            <div className="w-full flex items-start px-3 py-3 rounded-xl bg-[#2b3343]/80 border border-white/5">
                                                <div className="mt-0.5 mr-3 w-8 h-8 rounded flex items-center justify-center bg-[#384b6b] text-[#8ab4f8]">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-[#8ab4f8] text-[13px]">Meeting Notes: Q3 Roadmap</span>
                                                        <span className="text-[11px] text-[#8ab4f8]/70">2h ago</span>
                                                    </div>
                                                    <div className="text-[13px] truncate mt-0.5 text-[#8ab4f8]/60">Discussing key milestones and delivery dates...</div>
                                                </div>
                                            </div>
                                            <div className="w-full flex items-start px-3 py-3 rounded-xl border border-transparent opacity-60 mt-1">
                                                <div className="mt-0.5 mr-3 w-8 h-8 rounded flex items-center justify-center bg-white/5 text-muted-foreground">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-neutral-200 text-[13px]">Product Architecture</span>
                                                        <span className="text-[11px] text-muted-foreground">Yesterday</span>
                                                    </div>
                                                    <div className="text-[13px] truncate mt-0.5 text-muted-foreground/60">System design and database schema...</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                </div>
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
