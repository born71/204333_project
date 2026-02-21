import React, { useState } from 'react';
import pb from '../lib/pocketbase';
import './Profile.css';

const Profile = ({ currentUser, onBack, onUpdateUser }) => {
    const [name, setName] = useState(currentUser?.name || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = React.useRef(null);

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current?.click();
        }
    };

    const handleAvatarChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Name cannot be empty');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('name', name);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const record = await pb.collection('users').update(currentUser.id, formData);
            onUpdateUser(record);
            setIsEditing(false);
            setAvatarFile(null);
        } catch (err) {
            console.error(err);
            setError('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <button className="back-button" onClick={onBack}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Chat
                </button>
                <h2>User Profile</h2>
            </div>

            <div className="profile-content">
                <div className="profile-card">
                    <div className={`avatar-large ${isEditing ? 'editable' : ''}`} onClick={handleAvatarClick}>
                        {(avatarPreview || (currentUser?.avatar ? pb.files.getURL(currentUser, currentUser.avatar) : null)) ? (
                            <img
                                src={avatarPreview || pb.files.getURL(currentUser, currentUser.avatar)}
                                alt="Profile Avatar"
                                className="avatar-image"
                            />
                        ) : (
                            currentUser.name ? currentUser.name.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?')
                        )}
                        {isEditing && (
                            <div className="avatar-edit-overlay">
                                <span>Change</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="profile-info">
                        {/* <div className="info-group">
                            <label>User ID</label>
                            <p className="read-only">{currentUser.id}</p>
                        </div> */}

                        <div className="info-group">
                            <label>Email</label>
                            <p className="read-only">{currentUser.email}</p>
                        </div>

                        <div className="info-group">
                            <label>Display Name</label>
                            {isEditing ? (
                                <div className="edit-name-group">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="name-input"
                                        placeholder="Enter your name"
                                        autoFocus
                                    />
                                    <div className="action-buttons">
                                        <button className="save-button" onClick={handleSave} disabled={saving}>
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button className="cancel-button" onClick={() => { setIsEditing(false); setName(currentUser.name || ''); setAvatarFile(null); setAvatarPreview(null); setError(''); }} disabled={saving}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="display-name-group">
                                    <p className="read-only" style={{ padding: '8px 0', border: 'none', background: 'transparent' }}>
                                        {currentUser.name || <span className="no-name">Not set</span>}
                                    </p>
                                    <button className="edit-button" onClick={() => setIsEditing(true)}>Edit</button>
                                </div>
                            )}
                            {error && <span className="error-text">{error}</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
