-- Create campaigns table
CREATE TABLE public.campaigns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    customer_name TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    budget NUMERIC(12,2),
    notes TEXT,
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_screens table (junction table)
CREATE TABLE public.campaign_screens (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    screen_id BIGINT NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid(),
    UNIQUE(campaign_id, screen_id)
);

-- Add updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_screens ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns table
-- Users can see their own campaigns
CREATE POLICY "Users can view own campaigns" ON public.campaigns
    FOR SELECT USING (created_by = auth.uid());

-- Admins can see all campaigns
CREATE POLICY "Admins can view all campaigns" ON public.campaigns
    FOR SELECT USING (is_admin());

-- Users can insert campaigns (created_by will be set to auth.uid())
CREATE POLICY "Users can create campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON public.campaigns
    FOR UPDATE USING (created_by = auth.uid());

-- Admins can update all campaigns
CREATE POLICY "Admins can update all campaigns" ON public.campaigns
    FOR UPDATE USING (is_admin());

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns" ON public.campaigns
    FOR DELETE USING (created_by = auth.uid());

-- Admins can delete all campaigns
CREATE POLICY "Admins can delete all campaigns" ON public.campaigns
    FOR DELETE USING (is_admin());

-- RLS policies for campaign_screens table
-- Users can see campaign_screens for their own campaigns
CREATE POLICY "Users can view own campaign screens" ON public.campaign_screens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = campaign_screens.campaign_id 
            AND campaigns.created_by = auth.uid()
        )
    );

-- Admins can see all campaign_screens
CREATE POLICY "Admins can view all campaign screens" ON public.campaign_screens
    FOR SELECT USING (is_admin());

-- Users can insert campaign_screens for their own campaigns
CREATE POLICY "Users can create campaign screens" ON public.campaign_screens
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = campaign_screens.campaign_id 
            AND campaigns.created_by = auth.uid()
        )
    );

-- Users can update campaign_screens for their own campaigns
CREATE POLICY "Users can update own campaign screens" ON public.campaign_screens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = campaign_screens.campaign_id 
            AND campaigns.created_by = auth.uid()
        )
    );

-- Admins can update all campaign_screens
CREATE POLICY "Admins can update all campaign screens" ON public.campaign_screens
    FOR UPDATE USING (is_admin());

-- Users can delete campaign_screens for their own campaigns
CREATE POLICY "Users can delete own campaign screens" ON public.campaign_screens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = campaign_screens.campaign_id 
            AND campaigns.created_by = auth.uid()
        )
    );

-- Admins can delete all campaign_screens
CREATE POLICY "Admins can delete all campaign screens" ON public.campaign_screens
    FOR DELETE USING (is_admin());

-- Create indexes for better performance
CREATE INDEX idx_campaigns_created_by ON public.campaigns(created_by);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_date, end_date);
CREATE INDEX idx_campaign_screens_campaign_id ON public.campaign_screens(campaign_id);
CREATE INDEX idx_campaign_screens_screen_id ON public.campaign_screens(screen_id);
