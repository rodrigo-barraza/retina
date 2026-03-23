"use client";

import TooltipComponent from "./TooltipComponent";
import styles from "./ChatInputButton.module.css";

export default function ChatInputButton({
    icon,
    onClick,
    label,
    isActive = false,
    disabled = false,
    className = "",
    tooltipPosition = "top",
    ...props
}) {
    const btnClass = `${styles.chatInputBtn} ${isActive ? styles.active : ""} ${className}`.trim();

    return (
        <TooltipComponent label={label} position={tooltipPosition} trigger="hover">
            <button
                type="button"
                className={btnClass}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                {...props}
            >
                {icon}
            </button>
        </TooltipComponent>
    );
}
