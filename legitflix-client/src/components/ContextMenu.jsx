import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);
    const [style, setStyle] = useState({ top: y, left: x, opacity: 0 });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (event.button !== 0) return; // Only close on left click!
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', onClose);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    useLayoutEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            let adjustedLeft = x;
            let adjustedTop = y;

            // Prevent trailing off the right side
            if (x + rect.width > window.innerWidth) {
                adjustedLeft = window.innerWidth - rect.width - 12;
            }
            if (adjustedLeft < 12) {
                adjustedLeft = 12;
            }

            // Prevent trailing off the bottom
            if (y + rect.height > window.innerHeight) {
                adjustedTop = window.innerHeight - rect.height - 12;
            }
            if (adjustedTop < 12) {
                adjustedTop = 12;
            }

            setStyle({
                top: adjustedTop,
                left: adjustedLeft,
                opacity: 1
            });
        }
    }, [x, y]);

    return (
        <div className="lf-context-menu" style={style} ref={menuRef}>
            {options.map((option, index) => {
                if (option.type === 'separator') {
                    return <div key={index} className="lf-context-menu__separator" />;
                }

                return (
                    <div
                        key={index}
                        className={`lf-context-menu__item ${option.danger ? 'is-danger' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            option.action();
                            onClose();
                        }}
                    >
                        {option.icon && <span className="material-icons lf-context-menu__icon">{option.icon}</span>}
                        <span className="lf-context-menu__label">{option.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default ContextMenu;
