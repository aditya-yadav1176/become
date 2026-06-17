import React from "react";
import "./Instructions.css";

export default function Instructions({ isLocked, onClick }) {
  if (isLocked) return null;

  return (
    <div className="overlay" onClick={onClick}>
      <div className="card">
        <h1 className="title">BECOME</h1>
        <p className="subtitle">Step into the simulation</p>
        
        <div className="controls-container">
          <div className="control-row">
            <span className="key-cap">W</span>
            <span className="key-cap">A</span>
            <span className="key-cap">S</span>
            <span className="key-cap">D</span>
            <span className="control-label">Move</span>
          </div>
          <div className="control-row">
            <span className="key-cap wide">SPACE</span>
            <span className="control-label">Jump</span>
          </div>
          <div className="control-row">
            <span className="key-cap wide">MOUSE</span>
            <span className="control-label">Look around</span>
          </div>
        </div>
        
        <button className="start-btn">
          CLICK TO ENTER
        </button>
        
        <p className="footer">Press ESC to exit pointer lock</p>
      </div>
    </div>
  );
}
