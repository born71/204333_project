import React, { useState } from 'react';
import './Loading.css';

const Loading = () => {
    const [loading, setLoading] = useState(true);

    return (
        <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );
};

export default Loading;
