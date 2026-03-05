import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, ArrowRight, UtensilsCrossed } from "lucide-react";

interface KioskWelcomeModalProps {
    isOpen: boolean;
    onConfirm: (name: string, phone: string) => void;
}

export function KioskWelcomeModal({ isOpen, onConfirm }: KioskWelcomeModalProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length >= 9) {
            onConfirm(name, phone);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#121212] overflow-hidden p-6"
                >
                    {/* Background Decorative Elements */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px]" />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                        className="max-w-md w-full relative"
                    >
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20 rotate-12">
                                <UtensilsCrossed size={40} className="text-black -rotate-12" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-4">
                                BEM-VINDO AO<br />
                                <span className="text-orange-500">NOSSO MENU</span>
                            </h2>
                            <p className="text-gray-500 font-medium">
                                Identifique-se rapidamente para uma experiência personalizada e segura.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Seu Nome (Opcional)"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-white outline-none focus:ring-2 ring-orange-500/50 transition-all font-bold placeholder:text-gray-700"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="tel"
                                    required
                                    placeholder="Telemóvel (Obrigatório)"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-white outline-none focus:ring-2 ring-orange-500/50 transition-all font-bold placeholder:text-gray-700"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={phone.length < 9}
                                className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-800 disabled:text-gray-600 font-black text-black py-5 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                            >
                                COMEÇAR AGORA
                                <ArrowRight size={24} strokeWidth={3} />
                            </button>
                        </form>

                        <p className="text-center mt-8 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                            Privacidade garantida • Sem registos chatos
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
