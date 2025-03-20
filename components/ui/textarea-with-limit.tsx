"use client";

import * as React from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_TOKENS_PER_REQUEST, CHAR_PER_TOKEN } from "@/utils/config";

/**
 * Taille maximale d'un prompt utilisateur en nombre de caractères
 * Cette valeur est calculée à partir de la limite de tokens définie dans la configuration
 * En pratique, cette limite permet:
 * - D'éviter des coûts excessifs liés aux tokens
 * - De laisser suffisamment d'espace pour la réponse du modèle
 * - De permettre à l'utilisateur d'inclure du code ou des instructions détaillées
 *
 * Avec MAX_TOKENS_PER_REQUEST = 6000 et CHAR_PER_TOKEN = 4, cela donne 24000 caractères,
 * ce qui représente environ:
 * - 12 pages Word standard
 * - 300-500 lignes de code
 * - Un article de blog complet
 */
export const MAX_PROMPT_CHARS = MAX_TOKENS_PER_REQUEST * CHAR_PER_TOKEN;

export interface TextareaWithLimitProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  /**
   * Limite maximale de caractères (par défaut: MAX_PROMPT_CHARS)
   */
  maxLength?: number;
  /**
   * Afficher le compteur de caractères (par défaut: true)
   */
  showCounter?: boolean;
  /**
   * Fonction appelée lors du changement de valeur
   * @param value Valeur du textarea
   * @param isValid Indique si la valeur respecte la limite de caractères
   */
  onChange?: (value: string, isValid: boolean) => void;
}

/**
 * Textarea avec limite de caractères et compteur
 *
 * Ce composant étend le composant Textarea de Shadcn et ajoute:
 * - Un compteur de caractères
 * - Une validation de la limite de caractères
 * - Un retour d'information visuel et textuel lorsque la limite est dépassée
 *
 * Exemple d'utilisation:
 * ```tsx
 * <TextareaWithLimit
 *   value={prompt}
 *   onChange={(value, isValid) => {
 *     setPrompt(value);
 *     setIsValid(isValid);
 *   }}
 *   maxLength={10000}
 *   placeholder="Entrez votre prompt..."
 * />
 * ```
 */
const TextareaWithLimit = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithLimitProps
>(
  (
    {
      className,
      maxLength = MAX_PROMPT_CHARS,
      showCounter = true,
      onChange,
      value,
      ...props
    },
    ref,
  ) => {
    const [valueLength, setValueLength] = React.useState(0);

    React.useEffect(() => {
      if (typeof value === "string") {
        setValueLength(value.length);
      }
    }, [value, maxLength]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newLength = newValue.length;
      const newIsValid = newLength <= maxLength;

      setValueLength(newLength);

      if (onChange) {
        onChange(newValue, newIsValid);
      }
    };

    return (
      <div className="mb-1 w-full space-y-1">
        <Textarea
          ref={ref}
          className={className}
          value={value}
          onChange={handleChange}
          {...props}
        />
        {showCounter && (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                valueLength > maxLength
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {valueLength} / {maxLength}
            </span>
          </div>
        )}
      </div>
    );
  },
);

TextareaWithLimit.displayName = "TextareaWithLimit";

export { TextareaWithLimit };
