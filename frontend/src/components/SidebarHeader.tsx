import React from 'react';
import '../App.css';

export const SidebarHeader = () => {
  return (
    <div className="sidebar-header">
      <div className="brand-container">
        <video className="brand-video" autoPlay loop muted playsInline>
          <source src="/robot_logo.mp4" type="video/mp4" />
        </video>
        <h1><b>ConsultPro</b></h1>
      </div>
        <p>Your AI Consulting Assistant</p>
    </div>
  );
};