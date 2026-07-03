import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { config } = useTheme();
    const prefilledUsername = location.state?.username || '';
    const prefilledUserId = location.state?.userId || '';

    const [username, setUsername] = useState(prefilledUsername);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = "LegitFlix - Sign In";
    }, []);

    // Quick Connect State
    const [isQuickConnect, setIsQuickConnect] = useState(false);
    const [qcCode, setQcCode] = useState('');
    const [qcSecret, setQcSecret] = useState('');

    useEffect(() => {
        let pollInterval;

        const startQuickConnect = async () => {
            try {
                setLoading(true);
                const result = await jellyfinService.initiateQuickConnect();
                setQcCode(result.Code);
                setQcSecret(result.Secret);
                setLoading(false);

                // Start Polling
                pollInterval = setInterval(async () => {
                    if (!result.Secret) return;
                    try {
                        const user = await jellyfinService.checkQuickConnectStatus(result.Secret);
                        if (user) {
                            clearInterval(pollInterval);
                            navigate('/');
                        }
                    } catch (e) {
                        console.warn("Polling error", e);
                    }
                }, 2000);

            } catch (err) {
                console.error("Quick Connect Init Failed", err);
                setError("Failed to initialize Quick Connect.");
                setLoading(false);
            }
        };

        if (isQuickConnect) {
            startQuickConnect();
        } else {
            setQcCode('');
            setQcSecret('');
            if (pollInterval) clearInterval(pollInterval);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isQuickConnect, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await jellyfinService.authenticateUser(username, password);
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                navigate('/');
            } else {
                setError('Login succeeded but failed to retrieve user session.');
            }
        } catch (err) {
            console.error("Login error", err);
            setError('Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    const prodPath = import.meta.env.PROD ? '/LegitFlix/Client' : '';
    const fallbackAvatar = `${prodPath}/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png`;
    let userPfpUrl = null;
    if (prefilledUserId) {
        try {
            const cachedAvatars = JSON.parse(localStorage.getItem('legitflix_user_avatars') || '{}');
            if (cachedAvatars[prefilledUserId]) {
                userPfpUrl = cachedAvatars[prefilledUserId];
            }
        } catch (e) {}
        if (!userPfpUrl) {
            userPfpUrl = jellyfinService.getUserImageUrl(prefilledUserId, { tag: location.state?.tag });
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-page-backdrop"></div>
            {/* Flat Center Container */}
            <div className="auth-container-flat">
                <div className="login-header-section">
                    {prefilledUsername ? (
                        <div className="login-user-profile-summary">
                            <div className="login-avatar-flat">
                                <img 
                                    src={userPfpUrl || fallbackAvatar} 
                                    alt={prefilledUsername} 
                                    className="login-avatar-img"
                                    onError={(e) => { e.target.src = fallbackAvatar; }}
                                />
                            </div>
                            <h2>Sign In as {prefilledUsername}</h2>
                        </div>
                    ) : (
                        <h2>{isQuickConnect ? 'Quick Connect' : 'Log In'}</h2>
                    )}
                </div>

                {isQuickConnect ? (
                    <div className="qc-container">
                        {loading ? (
                            <div className="qc-spinner-wrapper">
                                <div className="qc-spinner"></div>
                            </div>
                        ) : (
                            <>
                                <div className="qc-instructions">
                                    Enter the code below on an already authorized device to sign in instantly.
                                </div>
                                <div className="qc-code-display">
                                    {qcCode}
                                </div>
                                <div className="qc-status-indicator">
                                    <div className="qc-spinner-small"></div>
                                    <span>Waiting for authorization...</span>
                                </div>
                            </>
                        )}
                        <button type="button" className="btn-crunchy-pill" onClick={() => setIsQuickConnect(false)}>
                            Cancel Quick Connect
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="crunchy-input-group">
                            <input
                                type="text"
                                className="crunchy-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label className="crunchy-label">Username</label>
                        </div>

                        <div className="crunchy-input-group">
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="crunchy-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                />
                                <label className="crunchy-label">Password</label>
                                <span
                                    className="material-icons password-toggle-modern"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </div>
                        </div>

                        {error && <div className="auth-error-modern">{error}</div>}

                        <div className="auth-actions-group">
                            <button type="submit" disabled={loading} className="btn-crunchy-pill primary">
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <button type="button" onClick={() => setIsQuickConnect(true)} className="btn-crunchy-pill">
                                Sign In with Quick Connect
                            </button>
                        </div>

                        <div className="crunchy-links">
                            <a className="crunchy-link" onClick={() => navigate('/login/select-user')}>
                                Back to Profiles
                            </a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
