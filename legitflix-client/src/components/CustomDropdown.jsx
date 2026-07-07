import React from 'react';
import './CustomDropdown.css';

const CustomDropdown = ({ icon, value, options, onChange, label }) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="custom-dropdown">
            <div className="custom-dropdown-trigger">
                {icon && <span className="material-icons dropdown-icon">{icon}</span>}
                <div className="dropdown-label-group">
                    {label && <span className="dropdown-label-tiny">{label}</span>}
                    <span className="dropdown-selected-text">{selectedOption ? selectedOption.label : 'Select...'}</span>
                </div>
                <span className="material-icons dropdown-arrow" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>expand_more</span>
            </div>

            <select
                className="custom-dropdown-native"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CustomDropdown;
