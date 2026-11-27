-- Fichier : livraisons_suivi.sql
-- ⚠️ Mettez D'ABORD en ligne la nouvelle version du site, PUIS exécutez ce script dans l'éditeur SQL de Supabase
-- (après les autres scripts, dont acompte_livraison.sql). Le script peut être relancé sans risque.
--
-- Communication entre la boutique, ses livreurs et le client :
--  1. Journal de chaque commande (passée, payée, acceptée, prise par un livreur, problème signalé, rendue,
--     livrée, annulée), visible par la boutique et l'administration.
--  2. Le livreur peut signaler un problème (client injoignable…) ou rendre une course.
--  3. Une course remise « à traiter » ou « en préparation » n'a plus de livreur.
--  4. Mises à jour en direct (Supabase Realtime) des commandes et du journal.
--  5. Le client voit l'historique simplifié de sa commande (application mobile) : jamais les messages
--     internes des livreurs ni les raisons des courses rendues.
-- =====================================================================

-- ---------------------------------------------------------------------------
-- 1. Journal des commandes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_events (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL,
    kind TEXT NOT NULL,          -- created, payment, status, driver_taken, driver_released, driver_issue, delivered
    status TEXT,                 -- statut de la commande après l'événement
    actor TEXT NOT NULL,         -- client, paiement, boutique, livreur, système
    actor_name TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order ON public.order_events (order_id, created_at);
CREATE INDEX IF NOT EXISTS order_events_merchant ON public.order_events (merchant_id, created_at DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Journal : boutique ou admin" ON public.order_events;
CREATE POLICY "Journal : boutique ou admin"
    ON public.order_events FOR SELECT TO authenticated
    USING (merchant_id = auth.uid() OR public.is_platform_admin());
-- Aucune politique d'écriture : seuls les déclencheurs et les fonctions ci-dessous écrivent.
REVOKE INSERT, UPDATE, DELETE ON public.order_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.order_status_label(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_status
        WHEN 'PENDING' THEN 'À traiter'
        WHEN 'PREPARING' THEN 'En préparation'
        WHEN 'IN_TRANSIT' THEN 'En livraison'
        WHEN 'DELIVERED' THEN 'Livrée'
        WHEN 'CANCELLED' THEN 'Annulée'
        WHEN 'DISPUTED' THEN 'En litige'
        ELSE coalesce(p_status, '?') END;
$$;

-- Qui a fait le changement : le livreur passe par ses fonctions sans compte (rôle anon), la boutique est
-- connectée (authenticated), le paiement arrive par le serveur (service_role).
CREATE OR REPLACE FUNCTION public.orders_track_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT := public.request_role();
    v_driver TEXT;
    v_reason TEXT;
BEGIN
    BEGIN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, message)
            VALUES (NEW.id, NEW.merchant_id, 'created', NEW.status::TEXT, 'client', CASE NEW.payment_method
                WHEN 'DEPOSIT' THEN 'Commande passée · acompte de 10 % en attente de paiement'
                WHEN 'MOBILE_MONEY' THEN 'Commande passée · paiement en ligne en attente'
                ELSE 'Commande passée · paiement à la livraison' END);
            RETURN NEW;
        END IF;

        IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status IN ('PAID', 'DEPOSIT_PAID') THEN
            INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, message)
            VALUES (NEW.id, NEW.merchant_id, 'payment', NEW.status::TEXT, 'paiement', CASE
                WHEN NEW.payment_status = 'DEPOSIT_PAID'
                    THEN 'Acompte de ' || coalesce(NEW.payment_deposit_amount, 0) || ' F payé en ligne'
                ELSE 'Paiement de ' || NEW.total_amount_fcfa || ' F reçu en ligne' END);
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            v_driver := coalesce(NEW.driver_name, OLD.driver_name);
            IF v_role = 'anon' THEN
                IF NEW.status::TEXT = 'IN_TRANSIT' THEN
                    INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, actor_name, message)
                    VALUES (NEW.id, NEW.merchant_id, 'driver_taken', 'IN_TRANSIT', 'livreur', v_driver, v_driver || ' a pris la course');
                ELSIF NEW.status::TEXT = 'DELIVERED' THEN
                    INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, actor_name, message)
                    VALUES (NEW.id, NEW.merchant_id, 'delivered', 'DELIVERED', 'livreur', v_driver, 'Livrée par ' || v_driver || ' (code du client validé)');
                ELSIF OLD.status::TEXT = 'IN_TRANSIT' AND NEW.status::TEXT = 'PREPARING' THEN
                    v_reason := nullif(trim(current_setting('samaboutik.reason', true)), '');
                    INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, actor_name, message)
                    VALUES (NEW.id, NEW.merchant_id, 'driver_released', 'PREPARING', 'livreur', OLD.driver_name,
                            'Course rendue par ' || OLD.driver_name || coalesce(' : ' || v_reason, ''));
                END IF;
            ELSE
                INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, message)
                VALUES (NEW.id, NEW.merchant_id, 'status', NEW.status::TEXT,
                        CASE WHEN v_role = 'authenticated' AND auth.uid() = NEW.merchant_id THEN 'boutique'
                             WHEN v_role = 'authenticated' THEN 'administration'
                             WHEN v_role = 'service_role' THEN 'paiement' ELSE 'système' END,
                        CASE WHEN v_role = 'authenticated' AND auth.uid() = NEW.merchant_id
                                 THEN 'Passée à « ' || public.order_status_label(NEW.status::TEXT) || ' » par la boutique'
                             WHEN v_role = 'authenticated'
                                 THEN 'Passée à « ' || public.order_status_label(NEW.status::TEXT) || ' » par l''administration'
                             ELSE 'Statut : ' || public.order_status_label(NEW.status::TEXT) END);
            END IF;
        END IF;
    EXCEPTION WHEN others THEN
        RAISE WARNING 'Journal de commande non enregistré : %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.orders_track_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_track_events ON public.orders;
CREATE TRIGGER orders_track_events
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_track_events();

-- ---------------------------------------------------------------------------
-- 2. Une course remise « à traiter » ou « en préparation » n'a plus de livreur
--    (sinon l'ancien livreur resterait affiché alors que la course est de nouveau disponible).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_driver_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::TEXT IN ('PENDING', 'PREPARING') THEN
        NEW.driver_name := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_driver_consistency ON public.orders;
CREATE TRIGGER orders_driver_consistency
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_driver_consistency();

-- ---------------------------------------------------------------------------
-- 3. Espace livreur : rendre une course, signaler un problème
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_order(p_token TEXT, p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_status order_status;
    v_driver TEXT;
BEGIN
    SELECT status, driver_name INTO v_status, v_driver
    FROM public.orders
    WHERE id = p_order_id AND merchant_id = v_session.merchant_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course introuvable.';
    END IF;
    IF v_status <> 'IN_TRANSIT'::order_status OR v_driver IS DISTINCT FROM v_session.driver_name THEN
        RAISE EXCEPTION 'Cette course ne vous est pas assignée.';
    END IF;

    -- La raison est reprise dans le journal par le déclencheur orders_track_events.
    PERFORM set_config('samaboutik.reason', left(trim(coalesce(p_reason, '')), 200), true);
    UPDATE public.orders SET status = 'PREPARING'::order_status, driver_name = NULL WHERE id = p_order_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_delivery_issue(p_token TEXT, p_order_id UUID, p_message TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_message TEXT := left(trim(coalesce(p_message, '')), 300);
    v_status order_status;
    v_driver TEXT;
BEGIN
    IF length(v_message) < 3 THEN
        RAISE EXCEPTION 'Décrivez le problème en quelques mots.';
    END IF;
    SELECT status, driver_name INTO v_status, v_driver
    FROM public.orders
    WHERE id = p_order_id AND merchant_id = v_session.merchant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course introuvable.';
    END IF;
    IF v_status <> 'IN_TRANSIT'::order_status OR v_driver IS DISTINCT FROM v_session.driver_name THEN
        RAISE EXCEPTION 'Cette course ne vous est pas assignée.';
    END IF;
    IF public.attempts_count('driver_issue', p_order_id::TEXT, interval '1 hour') >= 10 THEN
        RAISE EXCEPTION 'Trop de signalements pour cette course : appelez la boutique.';
    END IF;
    PERFORM public.attempts_log('driver_issue', p_order_id::TEXT);

    INSERT INTO public.order_events (order_id, merchant_id, kind, status, actor, actor_name, message)
    VALUES (p_order_id, v_session.merchant_id, 'driver_issue', 'IN_TRANSIT', 'livreur', v_session.driver_name, v_message);
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.release_order(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_delivery_issue(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_order(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_delivery_issue(TEXT, UUID, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Mises à jour en direct (tableau de bord de la boutique)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_events') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Côté client : historique simplifié de sa commande (application mobile)
--    Même accès que track_order (téléphone + code de livraison, mêmes limites d'essais).
--    Le client voit seulement des étapes (kind) : jamais les messages des livreurs, ni les raisons.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_order_history(p_phone TEXT, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key TEXT := public.phone_key(p_phone);
    v_pin TEXT := upper(regexp_replace(coalesce(p_pin, ''), '[^0-9A-Za-z]', '', 'g'));
    v_ip TEXT := public.client_ip();
    v_order_id UUID;
BEGIN
    IF public.attempts_count('track', v_key, interval '15 minutes') >= 5
       OR public.attempts_count('track_ip', v_ip, interval '15 minutes') >= 30 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
    END IF;

    IF length(v_key) >= 6 AND v_pin <> '' THEN
        SELECT id INTO v_order_id FROM public.orders
        WHERE delivery_pin = v_pin
          AND public.phone_key(customer_phone) = v_key
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_order_id IS NULL THEN
        PERFORM public.attempts_log('track', v_key);
        PERFORM public.attempts_log('track_ip', v_ip);
        RETURN json_build_object('ok', false, 'error', 'Commande introuvable ou code PIN incorrect');
    END IF;

    RETURN json_build_object('ok', true, 'order_id', v_order_id, 'events', coalesce((
        SELECT json_agg(json_build_object('kind', v.step, 'at', v.created_at, 'name', v.driver) ORDER BY v.id)
        FROM (
            SELECT e.id, e.created_at,
                   CASE
                       WHEN e.kind = 'created' THEN 'created'
                       WHEN e.kind = 'payment' AND e.message LIKE 'Acompte%' THEN 'deposit_paid'
                       WHEN e.kind = 'payment' THEN 'paid'
                       WHEN e.kind = 'driver_taken' THEN 'driver_taken'
                       WHEN e.kind = 'driver_released' THEN 'driver_changed'
                       WHEN e.kind = 'delivered' THEN 'delivered'
                       WHEN e.kind = 'driver_issue' AND (e.message ILIKE 'Client injoignable%' OR e.message ILIKE 'Client absent%') THEN 'driver_calling'
                       WHEN e.kind = 'driver_issue' AND e.message ILIKE 'Adresse introuvable%' THEN 'driver_lost'
                       WHEN e.kind = 'status' AND e.status = 'PREPARING' THEN 'accepted'
                       WHEN e.kind = 'status' AND e.status = 'IN_TRANSIT' THEN 'in_transit'
                       WHEN e.kind = 'status' AND e.status = 'DELIVERED' THEN 'delivered'
                       WHEN e.kind = 'status' AND e.status = 'CANCELLED' THEN 'cancelled'
                       WHEN e.kind = 'status' AND e.status = 'DISPUTED' THEN 'disputed'
                   END AS step,
                   CASE WHEN e.kind = 'driver_taken' THEN e.actor_name END AS driver
            FROM public.order_events e
            WHERE e.order_id = v_order_id
            ORDER BY e.id DESC
            LIMIT 60
        ) v
        WHERE v.step IS NOT NULL
    ), '[]'::json));
END;
$$;
REVOKE ALL ON FUNCTION public.track_order_history(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_history(TEXT, TEXT) TO anon, authenticated;
