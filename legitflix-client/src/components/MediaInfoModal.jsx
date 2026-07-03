import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './MediaInfoModal.css';

const MediaInfoModal = ({ isOpen, onClose, itemId }) => {
    const [mediaInfo, setMediaInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && itemId) {
            fetchMediaDetails();
        }
    }, [isOpen, itemId]);

    const fetchMediaDetails = async () => {
        setLoading(true);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) {
                onClose();
                return;
            }
            const details = await jellyfinService.getItemDetails(user.Id, itemId);
            setMediaInfo(details);
        } catch (e) {
            console.error('Failed to fetch media details', e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const source = mediaInfo?.MediaSources?.[0];
    const videoStream = source?.MediaStreams?.find(s => s.Type === 'Video');
    const audioStreams = source?.MediaStreams?.filter(s => s.Type === 'Audio') || [];
    const subtitleStreams = source?.MediaStreams?.filter(s => s.Type === 'Subtitle') || [];

    const formatBytes = (bytes) => {
        if (!bytes) return 'N/A';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatBitrate = (bitrate) => {
        if (!bitrate) return 'N/A';
        return (bitrate / 1000000).toFixed(2) + ' Mbps';
    };

    return (
        <div className="lf-info-modal-overlay" onClick={onClose}>
            <div className="lf-info-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="lf-info-modal-header">
                    <h2>Media Info</h2>
                    <button className="lf-info-modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="lf-info-modal-body">
                    {loading ? (
                        <div className="lf-info-modal-loader">
                            <div className="spinner"></div>
                        </div>
                    ) : !mediaInfo ? (
                        <div className="lf-info-modal-error">Failed to load media information.</div>
                    ) : (
                        <div className="lf-info-modal-scroll">
                            <h3 className="lf-info-modal-item-title">{mediaInfo.Name}</h3>
                            
                            {source ? (
                                <>
                                    <div className="lf-info-grid">
                                        <div className="lf-info-row">
                                            <span className="lf-info-label">Container:</span>
                                            <span className="lf-info-value">{source.Container || 'N/A'}</span>
                                        </div>
                                        <div className="lf-info-row">
                                            <span className="lf-info-label">File Size:</span>
                                            <span className="lf-info-value">{formatBytes(source.Size)}</span>
                                        </div>
                                        {videoStream && (
                                            <>
                                                <div className="lf-info-row">
                                                    <span className="lf-info-label">Resolution:</span>
                                                    <span className="lf-info-value">{videoStream.Width}x{videoStream.Height} ({videoStream.AspectRatio || 'N/A'})</span>
                                                </div>
                                                <div className="lf-info-row">
                                                    <span className="lf-info-label">Video Codec:</span>
                                                    <span className="lf-info-value">{(videoStream.Codec || 'N/A').toUpperCase()}</span>
                                                </div>
                                                <div className="lf-info-row">
                                                    <span className="lf-info-label">Bitrate:</span>
                                                    <span className="lf-info-value">{formatBitrate(source.Bitrate)}</span>
                                                </div>
                                                <div className="lf-info-row">
                                                    <span className="lf-info-label">Framerate:</span>
                                                    <span className="lf-info-value">{videoStream.AverageFrameRate ? `${videoStream.AverageFrameRate.toFixed(2)} fps` : 'N/A'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {source.Path && (
                                        <div className="lf-info-path-box">
                                            <div className="lf-info-path-label">File Path</div>
                                            <div className="lf-info-path-value">{source.Path}</div>
                                        </div>
                                    )}

                                    {audioStreams.length > 0 && (
                                        <div className="lf-info-section">
                                            <h4 className="lf-info-section-title">Audio Streams</h4>
                                            <div className="lf-info-stream-list">
                                                {audioStreams.map((audio, idx) => (
                                                    <div key={idx} className="lf-info-stream-item">
                                                        <span className="material-icons stream-icon">volume_up</span>
                                                        <div className="stream-details">
                                                            <div className="stream-title">{audio.DisplayTitle || `Audio ${idx + 1}`}</div>
                                                            <div className="stream-meta">
                                                                Codec: {(audio.Codec || '').toUpperCase()} | Channels: {audio.Channels || 'N/A'} | Lang: {(audio.Language || 'Unknown').toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {subtitleStreams.length > 0 && (
                                        <div className="lf-info-section">
                                            <h4 className="lf-info-section-title">Subtitle Streams</h4>
                                            <div className="lf-info-stream-list">
                                                {subtitleStreams.map((sub, idx) => (
                                                    <div key={idx} className="lf-info-stream-item">
                                                        <span className="material-icons stream-icon">subtitles</span>
                                                        <div className="stream-details">
                                                            <div className="stream-title">{sub.DisplayTitle || `Subtitle ${idx + 1}`}</div>
                                                            <div className="stream-meta">
                                                                Codec: {(sub.Codec || '').toUpperCase()} | Lang: {(sub.Language || 'Unknown').toUpperCase()} {sub.IsExternal ? '| External' : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="lf-info-modal-empty">No media source details available.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaInfoModal;
