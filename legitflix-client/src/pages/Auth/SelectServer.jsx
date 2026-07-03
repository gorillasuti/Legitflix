import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme, getDefaultLogo } from '../../context/ThemeContext';
import './Auth.css';

const SelectServer = () => {
    const navigate = useNavigate();
    const { config } = useTheme();
    const [url, setUrl] = useState(() => jellyfinService.getBasePath() || window.location.origin);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = "LegitFlix - Connect to Server";
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await jellyfinService.validateServer(url);
            if (res && res.valid) {
                jellyfinService.initialize(null, res.baseUrl);
                navigate('/login/select-user');
            } else {
                setError(res?.error || 'Could not connect to server. Please check the URL.');
            }
        } catch (e) {
            console.error("Validation error", e);
            setError('An error occurred while connecting.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page-backdrop"></div>
            
            {/* Top Header Bar */}
            <div className="auth-top-header">
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="LegitFlix" className="auth-top-header-logo" />
                ) : (
                    <img src={getDefaultLogo(config.accentColor)} alt="LegitFlix" className="auth-top-header-logo" />
                )}
            </div>

            {/* Flat Center Container */}
            <div className="auth-container-flat">
                <h2>Connect to Server</h2>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="crunchy-input-group">
                        <input
                            type="text"
                            className="crunchy-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder=" "
                            required
                        />
                        <label className="crunchy-label">Server Address</label>
                    </div>

                    {error && <div className="auth-error-modern">{error}</div>}

                    <div className="auth-actions-group">
                        <button type="submit" disabled={loading} className="btn-crunchy-pill primary">
                            {loading ? 'Connecting...' : 'Connect'}
                        </button>
                        <button type="button" className="btn-crunchy-pill" onClick={() => navigate('/login/select-user')}>
                            Back to Profiles
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SelectServer;
