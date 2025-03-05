import { LucideImage } from "lucide-react";
import { memo } from "react";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const ImageSelector = memo(
  ({
    fileInputRef,
    disabled,
    handleButtonClick,
    handleImageChange,
    isReverse = false,
  }: {
    fileInputRef: React.RefObject<HTMLInputElement>;
    disabled: boolean;
    handleButtonClick: () => void;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isReverse?: boolean;
  }) => {
    return (
      <>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept=".png, .jpeg, .jpg, .gif, .webp"
          onChange={handleImageChange}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isReverse ? "background" : "secondary"}
              className="w-full lg:w-auto"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={handleButtonClick}
            >
              <LucideImage className="size-3" />
              <span>Image</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Upload an image to generate a component with it</p>
          </TooltipContent>
        </Tooltip>
      </>
    );
  },
);

ImageSelector.displayName = "ImageSelector";
