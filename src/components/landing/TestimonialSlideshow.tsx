import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Calendar } from 'lucide-react';

const TESTIMONIALS = [
    {
        id: 1,
        videoUrl: "https://cdn.shopify.com/videos/c/o/v/f9dc970e72c144c9854e22fd19e3661e.mp4",
        name: "Libardino",
        handle: "@libardino"
    },
    {
        id: 2,
        videoUrl: "https://cdn.shopify.com/videos/c/o/v/bb7dfbe96dbb41dd91dad0c42145f877.mov",
        name: "Daniela",
        handle: "@danielaferrerr"
    },
    {
        id: 3,
        videoUrl: "https://cdn.shopify.com/videos/c/o/v/6daf7957939b4108808c92341e912e9e.mov",
        name: "Paula",
        handle: "@paulaserranor"
    },
    {
        id: 4,
        videoUrl: "https://cdn.shopify.com/videos/c/o/v/7d156d94be064ce9b106cc3201159523.mp4",
        name: "",
        handle: ""
    }
];

const VideoCard = ({ item }: { item: typeof TESTIMONIALS[0] }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true); // Autoplay by default
    const [isMuted, setIsMuted] = useState(true); // Muted by default for autoplay

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <motion.div
            className="flex-shrink-0 w-[280px] md:w-[320px] aspect-[9/16] relative rounded-2xl overflow-hidden snap-center bg-zinc-900 border border-white/10 group/card cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={item.videoUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                loop
                playsInline
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

            {/* Play/Pause Center Icon (only show if paused) */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                </div>
            )}

            {/* Controls & Info */}
            <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                <div className="flex items-end justify-between">

                    {/* User Info */}
                    {item.handle && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                                {item.name[0]}
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm shadow-black drop-shadow-md">{item.handle}</p>
                                <p className="text-xs text-green-400 font-medium">Verificado</p>
                            </div>
                        </div>
                    )}

                    {/* Mute Toggle */}
                    <button
                        onClick={toggleMute}
                        className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/10"
                    >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                </div>

                {/* Progress Bar (Visual Only for loop) */}
                <div className="w-full h-1 bg-white/20 rounded-full mt-4 overflow-hidden">
                    {isPlaying && (
                        <motion.div
                            className="h-full bg-green-500"
                            initial={{ x: '-100%' }}
                            animate={{ x: '0%' }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }} // Approx duration
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const TestimonialSlideshow = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="w-full pt-16 md:pt-24 pb-4 relative z-10">
            <div className="max-w-7xl mx-auto px-4">

                {/* Header */}
                <div className="text-center mb-12 space-y-2">
                    <h2 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-tight">
                        Ellos llevaron su Whatsapp
                    </h2>
                    <h2 className="text-3xl md:text-5xl font-bold text-green-500 uppercase tracking-tight">
                        a otro nivel ...
                    </h2>
                </div>

                {/* Carousel Container */}
                <div className="relative group">

                    {/* Navigation Buttons (Desktop) */}
                    {canScrollLeft && (
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm border border-white/10 transition-all hidden md:flex"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}

                    {canScrollRight && (
                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm border border-white/10 transition-all hidden md:flex"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}

                    {/* Scrollable Area */}
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8 px-4 md:px-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {TESTIMONIALS.map((item) => (
                            <VideoCard key={item.id} item={item} />
                        ))}
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="text-center mt-8">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="flex -space-x-2">
                            {[
                                "https://images.seeklogo.com/logo-png/42/1/libardino-logo-png_seeklogo-427640.png",
                                "https://agencia-elevate.com/cdn/shop/files/2.png?v=16139725970425458815&width=1193",
                                "https://agencia-elevate.com/cdn/shop/files/3.png?v=12595397720817518371&width=1193"
                            ].map((logo, i) => (
                                <img
                                    key={i}
                                    src={logo}
                                    alt={`Marca ${i + 1}`}
                                    className="w-8 h-8 rounded-full border border-black bg-white object-contain p-0.5"
                                />
                            ))}
                        </div>
                        <span className="text-2xl md:text-4xl font-bold text-green-500 ml-2">
                            +180 marcas
                        </span>
                    </div>

                    <div className="mt-6">
                        <Button
                            onClick={() => window.open('https://calendly.com/wipsy/demo', '_blank')}
                            className="bg-green-500 hover:bg-green-600 text-black font-bold rounded-full px-10 py-6 text-lg h-auto transition-all hover:scale-105 shadow-lg shadow-green-500/20 animate-shake"
                        >
                            <Calendar className="mr-2 h-5 w-5" />
                            Agendar Reunión
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
