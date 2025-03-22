"use client";

import { XIcon } from "lucide-react";
import * as React from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  FREE_CHAR_LIMIT,
  PREMIUM_CHAR_LIMIT,
  getCharacterLimit,
} from "@/utils/config";

import { Button } from "./ui/button";

export interface TextareaWithLimitProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  /**
   * Limite maximale de caractères (basée sur l'abonnement ou définie par maxLength)
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
  /**
   * Abonnement de l'utilisateur, utilisé pour déterminer la limite de caractères
   */
  subscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  /**
   * Indique si le chargement de l'abonnement est en cours
   */
  isLoadingSubscription?: boolean;
  /**
   * Indique si l'utilisateur est connecté
   */
  isLoggedIn?: boolean;
  /**
   * Indique si le composant est en cours de chargement
   */
  isLoading?: boolean;
  /**
   * Indique si le message d'upsell doit être affiché
   */
  displayMessage?: boolean;
}

/**
 * Textarea avec limite de caractères et compteur
 *
 * Ce composant étend le composant Textarea de Shadcn et ajoute:
 * - Un compteur de caractères
 * - Une validation de la limite de caractères
 * - Un retour d'information visuel et textuel lorsque la limite est dépassée
 * - Un message d'upsell pour les utilisateurs non premium
 * - Masquage des informations pendant le chargement de l'abonnement
 *
 * Exemple d'utilisation:
 * ```tsx
 * <TextareaWithLimit
 *   value={prompt}
 *   onChange={(value, isValid) => {
 *     setPrompt(value);
 *     setIsValid(isValid);
 *   }}
 *   subscription={subscription}
 *   isLoadingSubscription={isLoadingSubscription}
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
      maxLength,
      showCounter = true,
      onChange,
      value,
      subscription,
      isLoadingSubscription = false,
      isLoggedIn,
      isLoading,
      displayMessage = true,
      ...props
    },
    ref,
  ) => {
    // Déterminer la limite de caractères en fonction de l'abonnement
    const characterLimit = React.useMemo(() => {
      if (maxLength) return maxLength; // Si maxLength est spécifié, l'utiliser
      return getCharacterLimit(subscription || null); // Sinon, calculer selon l'abonnement
    }, [maxLength, subscription]);

    const [valueLength, setValueLength] = React.useState(0);

    React.useEffect(() => {
      if (typeof value === "string") {
        setValueLength(value.length);
      }
    }, [value, characterLimit]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newLength = newValue.length;
      const newIsValid = newLength <= characterLimit;

      setValueLength(newLength);

      if (onChange) {
        onChange(newValue, newIsValid);
      }
    };

    return (
      <div className="relative mb-1 w-full space-y-1">
        <Textarea
          ref={ref}
          className={className}
          value={value}
          onChange={handleChange}
          {...props}
        />
        <div className="flex items-center justify-between">
          {!isLoadingSubscription &&
            !subscription &&
            isLoggedIn &&
            valueLength > characterLimit &&
            displayMessage && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-yellow-600">
                  Limit: {FREE_CHAR_LIMIT} characters.
                </span>{" "}
                <a
                  href="/pricing"
                  className="text-primary underline hover:text-primary/80"
                >
                  Upgrade to a paid plan
                </a>{" "}
                to get {PREMIUM_CHAR_LIMIT} characters!
              </p>
            )}
          {showCounter && !isLoadingSubscription && isLoggedIn && (
            <span
              className={cn(
                "text-xs ml-auto",
                valueLength > characterLimit
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {valueLength} / {characterLimit}
            </span>
          )}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-0.5 size-6 p-0"
            disabled={isLoading}
            onClick={() => {
              onChange?.("", true);
            }}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Clear input</span>
          </Button>
        )}
      </div>
    );
  },
);

TextareaWithLimit.displayName = "TextareaWithLimit";

export { TextareaWithLimit };
