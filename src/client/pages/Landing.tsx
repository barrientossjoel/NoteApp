import { ArrowRight, BookOpen, Cloud, Lock, Sparkles, Layers, Search, Cpu } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Landing() {
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
                    <span className="text-xl font-bold tracking-tight text-foreground">Closure</span>
                </div>
                <div className="flex items-center gap-4">
                    <a href="/login" className="text-sm font-medium text-neutral-400 hover:text-foreground transition-colors">
                        Log In
                    </a>
                    <Button asChild className="rounded-full bg-white text-black hover:bg-neutral-200 transition-colors px-6">
                        <a href="/register">Get Started</a>
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-24 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-300 mb-8 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>The next generation of thought organization</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 mb-8">
                    Your Mind, <br className="hidden md:block" /> Uncluttered and Connected.
                </h1>

                <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    A beautiful, fast, and local-first thinking environment. Seamlessly connect your notes, visualize your ideas on an infinite canvas, and never lose a thought again.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-neutral-200 hover:text-black h-14 px-8 text-base">
                        <a href="/register">
                            Start Computing
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </a>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full border-border bg-background hover:bg-muted text-foreground h-14 px-8 text-base backdrop-blur-sm">
                        <a href="#features">Explore Features</a>
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
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">Designed for Focus. <br /> Built for Speed.</h2>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">Everything you need to capture, connect, and synthesize your knowledge in an environment that stays out of your way.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Layers,
                                title: "Infinite Canvas",
                                desc: "Break out of linear documents. Visually map your thoughts, connect ideas, and see the big picture."
                            },
                            {
                                icon: BookOpen,
                                title: "Powerful Markdown",
                                desc: "Write at the speed of thought. Full support for GitHub-flavored markdown, tables, and task lists."
                            },
                            {
                                icon: Cloud,
                                title: "Seamless Sync",
                                desc: "Your notes are always within reach. Instantly synchronized across all your devices securely."
                            },
                            {
                                icon: Lock,
                                title: "Privacy First",
                                desc: "Your data is yours. Local-first architecture ensures you have access even offline."
                            },
                            {
                                icon: Cpu,
                                title: "Lightning Fast",
                                desc: "Built on modern web technologies to be instantaneous. No loading spinners, no waiting."
                            },
                            {
                                icon: Search,
                                title: "Instant Search",
                                desc: "Find exactly what you're looking for with robust, full-text search across your entire vault."
                            }
                        ].map((feature, i) => (
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

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-border bg-background">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/icon_cropped.png" alt="Closure Logo" className="w-4 h-4 object-contain" />
                        <span className="font-semibold tracking-tight text-foreground">Closure</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © {new Date().getFullYear()} Closure. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
