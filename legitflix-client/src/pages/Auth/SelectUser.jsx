import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import SkeletonLoader from '../../components/SkeletonLoader';
import './Auth.css';

// Safe User Avatar Component with robust fallback states
const UserAvatar = ({ userId, userName, tag }) => {
    const [imgError, setImgError] = useState(false);
    const [imgLoading, setImgLoading] = useState(true);

    let imageUrl = null;
    if (!tag) {
        try {
            const cachedAvatars = JSON.parse(localStorage.getItem('legitflix_user_avatars') || '{}');
            if (cachedAvatars[userId]) {
                imageUrl = cachedAvatars[userId];
            }
        } catch (e) { }
    }

    if (!imageUrl) {
        imageUrl = jellyfinService.getUserImageUrl(userId, { tag });
    }

    if (imgError || !imageUrl) {
        return (
            <img
                src="https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png"
                alt={userName}
                className="netflix-avatar"
            />
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {imgLoading && (
                <div style={{ position: 'absolute', inset: 0 }}>
                    <SkeletonLoader type="rect" width="100%" height="100%" style={{ borderRadius: '4px' }} />
                </div>
            )}
            <img
                src={imageUrl}
                alt={userName}
                className="netflix-avatar"
                onLoad={() => setImgLoading(false)}
                onError={() => {
                    setImgError(true);
                    setImgLoading(false);
                }}
                style={imgLoading ? { opacity: 0 } : { opacity: 1, transition: 'opacity 0.2s ease' }}
            />
        </div>
    );
};

const SelectUser = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "LegitFlix - Who's Watching?";
        const loadUsers = async () => {
            try {
                const publicUsers = await jellyfinService.getPublicUsers();
                if (publicUsers) setUsers(publicUsers);
            } catch (e) {
                console.error("Failed to load users", e);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const handleUserSelect = (user) => {
        const tag = user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary);
        navigate('/login', { state: { username: user.Name, userId: user.Id, tag } });
    };

    const handleManual = () => {
        navigate('/login');
    };

    const handleChangeServer = () => {
        navigate('/login/select-server');
    };

    return (
        <div className="auth-page">
            <div className="auth-page-backdrop"></div>

            <div className="auth-container-flat select-user-container">
                <h1 className="netflix-profile-heading">Who's watching?</h1>

                {loading ? (
                    <div className="netflix-user-grid">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="netflix-user-card" style={{ cursor: 'default' }}>
                                <div className="netflix-avatar-container" style={{ background: 'transparent' }}>
                                    <SkeletonLoader type="rect" width="120px" height="120px" style={{ borderRadius: '4px' }} />
                                </div>
                                <SkeletonLoader type="text" width="60px" height="16px" style={{ marginTop: '12px' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {users.length > 0 ? (
                            <div className="netflix-user-grid">
                                {users.map(user => (
                                    <button
                                        key={user.Id}
                                        className="netflix-user-card"
                                        onClick={() => handleUserSelect(user)}
                                    >
                                        <div className="netflix-avatar-container">
                                            <UserAvatar
                                                userId={user.Id}
                                                userName={user.Name}
                                                tag={user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary)}
                                            />
                                        </div>
                                        <span className="netflix-user-name">{user.Name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="no-users-message">
                                No public users found on this server.
                            </div>
                        )}

                        <div className="netflix-footer-actions">
                            <button className="btn-netflix-style" onClick={handleManual}>
                                Manual Sign In
                            </button>
                            <button className="netflix-link-flat" onClick={handleChangeServer}>
                                Switch Server Address
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SelectUser;
