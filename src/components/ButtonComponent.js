/**
 * Local re-export of ButtonComponent from @rodrigo-barraza/components
 * with SoundService wired in. All existing imports point here so
 * callers don't need to change their onClick / onMouseEnter handlers.
 */
import { forwardRef } from "react";
import { ButtonComponent as BaseButtonComponent } from "@rodrigo-barraza/components";
import SoundService from "@/services/SoundService";

const ButtonComponent = forwardRef(function ButtonComponent(
  { onClick, onMouseEnter, ...rest },
  ref,
) {
  return (
    <BaseButtonComponent
      ref={ref}
      onMouseEnter={(e) => {
        SoundService.playHoverButton({ event: e });
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        SoundService.playClickButton({ event: e });
        onClick?.(e);
      }}
      {...rest}
    />
  );
});

export default ButtonComponent;
