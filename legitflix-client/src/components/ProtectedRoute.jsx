import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import './SkeletonLoader.css';

// 1. Home Page Skeleton Loader
const HomeSkeleton = () => (
    <div className="home-page" style={{ position: 'fixed', inset: 0, background: '#141414', zIndex: 9999, overflowY: 'auto' }}>
        {/* Dummy Navbar Shell */}
        <nav className="navbar" style={{ background: 'transparent' }}>
            <div className="nav-content">
                <div className="nav-start">
                    <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
                </div>
            </div>
        </nav>

        {/* Hero Carousel Skeleton */}
        <div className="hero-carousel-container" style={{ height: '90vh', background: '#141414', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: '42.5%',
                left: '4%',
                transform: 'translateY(-50%)',
                width: '40%',
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
            }}>
                <div className="skeleton" style={{ width: '70%', height: '60px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '40%', height: '24px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div className="skeleton" style={{ width: '100%', height: '18px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ width: '95%', height: '18px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ width: '60%', height: '18px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
                    <div className="skeleton" style={{ width: '160px', height: '46px', borderRadius: '50px' }} />
                    <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '50%' }} />
                    <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '50%' }} />
                </div>
            </div>
        </div>

        {/* Content Container */}
        <div className="home-content-container" style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ paddingLeft: '4%', paddingRight: '4%', marginTop: '40px' }}>
                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Browse Libraries</h2>
                <div className="libraries-grid" style={{ display: 'flex', gap: '15px', overflowX: 'hidden', marginBottom: '40px', marginTop: '-15px', paddingTop: '15px', paddingBottom: '20px' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="library-card skeleton" />
                    ))}
                </div>

                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                <div className="backdrop-scroll-container" style={{ display: 'flex', gap: '15px', overflowX: 'hidden' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="backdrop-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="backdrop-card-image skeleton" />
                            <div className="skeleton" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                            <div className="skeleton" style={{ width: '45%', height: '12px', borderRadius: '4px' }} />
                        </div>
                    ))}
                </div>

                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Up Next</h2>
                <div className="backdrop-scroll-container" style={{ display: 'flex', gap: '15px', overflowX: 'hidden' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="backdrop-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="backdrop-card-image skeleton" />
                            <div className="skeleton" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                            <div className="skeleton" style={{ width: '45%', height: '12px', borderRadius: '4px' }} />
                        </div>
                    ))}
                </div>

                <section className="featured-promo-section">
                    <div className="promo3-container" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden' }}>
                        <div className="promo3-content-wrapper" style={{ pointerEvents: 'none' }}>
                            <div className="promo3-left-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="skeleton" style={{ width: '60%', height: '24px', borderRadius: '4px' }} />
                                <div className="skeleton" style={{ width: '40%', height: '16px', borderRadius: '4px', marginBottom: '16px' }} />
                                <div className="skeleton" style={{ width: '80%', height: '45px', borderRadius: '4px', marginBottom: '10px' }} />
                                <div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
                                <div className="skeleton" style={{ width: '100%', height: '14px', borderRadius: '4px' }} />
                                <div className="skeleton" style={{ width: '90%', height: '14px', borderRadius: '4px', marginBottom: '16px' }} />
                                <div className="promo3-btn-row" style={{ display: 'flex', gap: '12px' }}>
                                    <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '6px' }} />
                                    <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '6px' }} />
                                </div>
                            </div>
                            <div className="promo3-right-carousel">
                                <div className="promo3-cards-scroll" style={{ display: 'flex', gap: '12px' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="promo3-card skeleton" style={{ flex: '0 0 150px', width: '150px', height: '225px', borderRadius: '10px' }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
);

// 2. Series Detail Page Skeleton Loader
const SeriesSkeleton = () => (
    <div className="lf-series-container" style={{ position: 'fixed', inset: 0, background: '#141414', zIndex: 9999, overflowY: 'auto' }}>
        <nav className="navbar scrolled">
            <div className="nav-content">
                <div className="nav-start">
                    <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
                </div>
            </div>
        </nav>
        <section className="lf-series-hero">
            <div className="lf-series-hero__backdrop" style={{ background: '#141414' }}></div>
            <div className="lf-series-hero__content">
                <div className="lf-series-hero__poster">
                    <div className="skeleton" style={{ width: '100%', height: '100%', aspectRatio: '2/3', borderRadius: '8px' }} />
                </div>
                <div className="lf-series-hero__info">
                    <h1 className="lf-series-hero__title" style={{ marginBottom: '1rem' }}>
                        <div className="skeleton" style={{ width: '60%', height: '3rem' }} />
                    </h1>
                    <div className="lf-series-hero__meta" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="skeleton" style={{ width: '60px', height: '1.2em' }} />
                        <div className="skeleton" style={{ width: '40px', height: '1.2em' }} />
                        <div className="skeleton" style={{ width: '80px', height: '1.2em' }} />
                    </div>
                    <div className="lf-series-hero__details">
                        <div className="lf-series-hero__description">
                            <div className="skeleton" style={{ width: '100%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '95%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '90%', height: '1.2em' }} />
                        </div>
                        <div className="lf-series-hero__cast-info" style={{ marginTop: '1rem' }}>
                            <div className="skeleton" style={{ width: '80%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '70%', height: '1.2em' }} />
                        </div>
                    </div>
                    <div className="lf-series-hero__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <div className="skeleton" style={{ width: '180px', height: '48px', borderRadius: '24px' }} />
                        <div className="skeleton" style={{ width: '160px', height: '48px', borderRadius: '24px' }} />
                    </div>
                </div>
            </div>
        </section>
        <div className="lf-content-section" style={{ paddingLeft: '4%', paddingRight: '4%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="skeleton" style={{ width: '200px', height: '40px', borderRadius: '8px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="skeleton" style={{ width: '100px', height: '40px', borderRadius: '8px' }} />
                    <div className="skeleton" style={{ width: '100px', height: '40px', borderRadius: '8px' }} />
                </div>
            </div>
            <div className="lf-episode-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="lf-episode-card" style={{ pointerEvents: 'none' }}>
                        <div className="lf-episode-card__thumbnail">
                            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                        </div>
                        <div className="lf-episode-card__info">
                            <div className="skeleton" style={{ width: '80%', height: '1.2em', marginBottom: '4px' }} />
                            <div className="skeleton" style={{ width: '60%', height: '1em' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// 3. Movie Detail Page Skeleton Loader
const MovieSkeleton = () => (
    <div className="lf-movie-container" style={{ position: 'fixed', inset: 0, background: '#141414', zIndex: 9999, overflowY: 'auto' }}>
        <nav className="navbar scrolled">
            <div className="nav-content">
                <div className="nav-start">
                    <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
                </div>
            </div>
        </nav>
        <section className="lf-movie-hero">
            <div className="lf-movie-hero__backdrop" style={{ background: '#141414' }}></div>
            <div className="lf-movie-hero__content">
                <div className="lf-movie-hero__poster">
                    <div className="skeleton" style={{ width: '100%', height: '100%', aspectRatio: '2/3', borderRadius: '8px' }} />
                </div>
                <div className="lf-movie-hero__info">
                    <h1 className="lf-movie-hero__title" style={{ marginBottom: '1rem' }}>
                        <div className="skeleton" style={{ width: '60%', height: '3rem' }} />
                    </h1>
                    <div className="lf-movie-hero__meta" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="skeleton" style={{ width: '60px', height: '1.2em' }} />
                        <div className="skeleton" style={{ width: '40px', height: '1.2em' }} />
                        <div className="skeleton" style={{ width: '80px', height: '1.2em' }} />
                    </div>
                    <div className="lf-movie-hero__details">
                        <div className="lf-movie-hero__description">
                            <div className="skeleton" style={{ width: '100%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '95%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '90%', height: '1.2em' }} />
                        </div>
                        <div className="lf-movie-hero__cast-info" style={{ marginTop: '1rem' }}>
                            <div className="skeleton" style={{ width: '80%', height: '1.2em', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ width: '70%', height: '1.2em' }} />
                        </div>
                    </div>
                    <div className="lf-movie-hero__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <div className="skeleton" style={{ width: '180px', height: '48px', borderRadius: '24px' }} />
                        <div className="skeleton" style={{ width: '160px', height: '48px', borderRadius: '24px' }} />
                    </div>
                </div>
            </div>
        </section>
        <div className="lf-content-section" style={{ paddingLeft: '4%', paddingRight: '4%' }}>
            <div className="skeleton" style={{ width: '200px', height: '2rem', marginBottom: '20px' }} />
            <div className="lf-cast-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="lf-cast-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '10px' }} />
                        <div className="skeleton" style={{ width: '80%', height: '1.2em', marginBottom: '4px' }} />
                        <div className="skeleton" style={{ width: '60%', height: '1em' }} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// 4. Library & Favorites Grid Page Skeleton Loader
const LibrarySkeleton = ({ title = 'Library' }) => (
    <div className="library-page" style={{ position: 'fixed', inset: 0, background: '#141414', zIndex: 9999, overflowY: 'auto' }}>
        <nav className="navbar scrolled">
            <div className="nav-content">
                <div className="nav-start">
                    <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
                </div>
            </div>
        </nav>
        <div className="library-header-container" style={{ marginTop: '80px', padding: '0 4%' }}>
            <div className="library-header-content">
                <h1 className="library-title">{title}</h1>
            </div>
        </div>
        <div className="library-grid-container" style={{ padding: '0 4%' }}>
            <div className="library-grid">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="library-grid-item">
                        <div className="skeleton" style={{ width: '100%', height: '100%', aspectRatio: '2/3', borderRadius: '8px' }} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// 5. Profile / Settings Page Skeleton Loader
const ProfileSkeleton = () => (
    <div className="profile-page" style={{ position: 'fixed', inset: 0, background: '#141414', zIndex: 9999, overflowY: 'auto' }}>
        <nav className="navbar scrolled">
            <div className="nav-content">
                <div className="nav-start">
                    <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
                </div>
            </div>
        </nav>
        <div className="settings-container" style={{ marginTop: '80px', padding: '0 4%' }}>
            <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '20px' }} />
            <div className="settings-tabs-wrapper">
                <div className="settings-tabs">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ display: 'inline-block', marginRight: '8px', borderRadius: '20px', width: '100px', height: '40px' }} />
                    ))}
                </div>
            </div>
            <div className="skeleton" style={{ width: '100%', height: '250px', margin: '20px 0', borderRadius: '12px' }} />
            <div style={{ display: 'flex', gap: '20px', marginTop: '-55px', paddingLeft: '30px', position: 'relative', marginBottom: '28px' }}>
                <div className="skeleton" style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid #0e0e0e' }} />
            </div>
            <div className="settings-card" style={{ padding: '28px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', background: '#181818' }}>
                <div className="skeleton" style={{ width: '180px', height: '24px', marginBottom: '24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '18px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i}>
                            <div className="skeleton" style={{ width: '80px', height: '14px', marginBottom: '8px' }} />
                            <div className="skeleton" style={{ width: '140px', height: '20px' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// 6. Video Player Loading Layer
const PlayerSkeleton = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="lf-player-loading-spinner-layer">
            <div className="spinner cr-spinner-orange"></div>
        </div>
    </div>
);

const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (e) {
                console.error("Auth check failed", e);
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        const path = location.pathname;

        if (path.startsWith('/series/')) {
            return <SeriesSkeleton />;
        }
        if (path.startsWith('/movie/')) {
            return <MovieSkeleton />;
        }
        if (path.startsWith('/library/')) {
            return <LibrarySkeleton title="Library" />;
        }
        if (path.startsWith('/favorites')) {
            return <LibrarySkeleton title="Favorites" />;
        }
        if (path.startsWith('/profile')) {
            return <ProfileSkeleton />;
        }
        if (path.startsWith('/play/') || path.startsWith('/player')) {
            return <PlayerSkeleton />;
        }

        // Default to Home Page skeleton
        return <HomeSkeleton />;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login/select-user" replace />;
};

export default ProtectedRoute;

