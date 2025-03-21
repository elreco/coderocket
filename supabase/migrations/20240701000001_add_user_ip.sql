-- Ajouter une colonne ip_address à la table users pour stocker l'adresse IP lors de l'inscription
ALTER TABLE public.users ADD COLUMN ip_address TEXT;

-- Ajouter un index sur cette colonne pour accélérer les recherches par IP
CREATE INDEX idx_users_ip_address ON public.users (ip_address);

-- Créer une fonction pour limiter le nombre d'inscriptions par IP
CREATE OR REPLACE FUNCTION check_registrations_per_ip()
RETURNS TRIGGER AS $$
DECLARE
  ip_count INTEGER;
BEGIN
  -- Compter le nombre de comptes avec cette IP
  SELECT COUNT(*) INTO ip_count FROM public.users WHERE ip_address = NEW.ip_address;

  -- Si plus de 3 comptes utilisent la même IP, bloquer l'inscription
  -- Vous pouvez ajuster ce nombre selon vos besoins
  IF ip_count >= 1 THEN
    RAISE EXCEPTION 'Too many accounts created with this IP address.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour vérifier les nouvelles inscriptions
CREATE TRIGGER limit_ip_registrations
BEFORE INSERT ON public.users
FOR EACH ROW
WHEN (NEW.ip_address IS NOT NULL AND NEW.ip_address != '')
EXECUTE FUNCTION check_registrations_per_ip();