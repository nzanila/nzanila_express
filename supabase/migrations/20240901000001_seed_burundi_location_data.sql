-- Seed Burundi location data (New 5-province system effective 2025)
-- Based on Loi Organique n°1/05 du 16 mars 2023

-- Insert Provinces (5 new provinces)
INSERT INTO burundi_provinces (name, name_en, name_fr, name_rn, name_sw) VALUES
('Buhumuza', 'Buhumuza', 'Buhumuza', 'Buhumuza', 'Buhumuza'),
('Bujumbura', 'Bujumbura', 'Bujumbura', 'Bujumbura', 'Bujumbura'),
('Burunga', 'Burunga', 'Burunga', 'Burunga', 'Burunga'),
('Butanyerera', 'Butanyerera', 'Butanyerera', 'Butanyerera', 'Butanyerera'),
('Gitega', 'Gitega', 'Gitega', 'Gitega', 'Gitega')
ON CONFLICT (name) DO NOTHING;

-- Insert Communes for Bujumbura Province (11 communes)
INSERT INTO burundi_communes (province_id, name, name_en, name_fr, name_rn, name_sw) VALUES
-- Bujumbura Province communes
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Bubanza', 'Bubanza', 'Bubanza', 'Bubanza', 'Bubanza'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Bukinanyana', 'Bukinanyana', 'Bukinanyana', 'Bukinanyana', 'Bukinanyana'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Cibitoke', 'Cibitoke', 'Cibitoke', 'Cibitoke', 'Cibitoke'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Isare', 'Isare', 'Isare', 'Isare', 'Isare'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Mpanda', 'Mpanda', 'Mpanda', 'Mpanda', 'Mpanda'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Mugere', 'Mugere', 'Mugere', 'Mugere', 'Mugere'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Mugina', 'Mugina', 'Mugina', 'Mugina', 'Mugina'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Muhuta', 'Muhuta', 'Muhuta', 'Muhuta', 'Muhuta'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Mukaza', 'Mukaza', 'Mukaza', 'Mukaza', 'Mukaza'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Ntahangwa', 'Ntahangwa', 'Ntahangwa', 'Ntahangwa', 'Ntahangwa'),
((SELECT id FROM burundi_provinces WHERE name = 'Bujumbura'), 'Rwibaga', 'Rwibaga', 'Rwibaga', 'Rwibaga', 'Rwibaga')
ON CONFLICT (province_id, name) DO NOTHING;

-- Insert Communes for Buhumuza Province (7 communes)
INSERT INTO burundi_communes (province_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Butaganzwa', 'Butaganzwa', 'Butaganzwa', 'Butaganzwa', 'Butaganzwa'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Butihinda', 'Butihinda', 'Butihinda', 'Butihinda', 'Butihinda'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Cankuzo', 'Cankuzo', 'Cankuzo', 'Cankuzo', 'Cankuzo'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Gisagara', 'Gisagara', 'Gisagara', 'Gisagara', 'Gisagara'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Gisuru', 'Gisuru', 'Gisuru', 'Gisuru', 'Gisuru'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Muyinga', 'Muyinga', 'Muyinga', 'Muyinga', 'Muyinga'),
((SELECT id FROM burundi_provinces WHERE name = 'Buhumuza'), 'Ruyigi', 'Ruyigi', 'Ruyigi', 'Ruyigi', 'Ruyigi')
ON CONFLICT (province_id, name) DO NOTHING;

-- Insert Communes for Burunga Province (7 communes)
INSERT INTO burundi_communes (province_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Bururi', 'Bururi', 'Bururi', 'Bururi', 'Bururi'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Makamba', 'Makamba', 'Makamba', 'Makamba', 'Makamba'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Rutana', 'Rutana', 'Rutana', 'Rutana', 'Rutana'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Rumonge', 'Rumonge', 'Rumonge', 'Rumonge', 'Rumonge'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Vyanda', 'Vyanda', 'Vyanda', 'Vyanda', 'Vyanda'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Songa', 'Songa', 'Songa', 'Songa', 'Songa'),
((SELECT id FROM burundi_provinces WHERE name = 'Burunga'), 'Busoni', 'Busoni', 'Busoni', 'Busoni', 'Busoni')
ON CONFLICT (province_id, name) DO NOTHING;

-- Insert Communes for Butanyerera Province (8 communes)
INSERT INTO burundi_communes (province_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Kayanza', 'Kayanza', 'Kayanza', 'Kayanza', 'Kayanza'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Kirundo', 'Kirundo', 'Kirundo', 'Kirundo', 'Kirundo'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Ngozi', 'Ngozi', 'Ngozi', 'Ngozi', 'Ngozi'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Muramvya', 'Muramvya', 'Muramvya', 'Muramvya', 'Muramvya'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Kiganda', 'Kiganda', 'Kiganda', 'Kiganda', 'Kiganda'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Mwumba', 'Mwumba', 'Mwumba', 'Mwumba', 'Mwumba'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Ruhororo', 'Ruhororo', 'Ruhororo', 'Ruhororo', 'Ruhororo'),
((SELECT id FROM burundi_provinces WHERE name = 'Butanyerera'), 'Gahombo', 'Gahombo', 'Gahombo', 'Gahombo', 'Gahombo')
ON CONFLICT (province_id, name) DO NOTHING;

-- Insert Communes for Gitega Province (9 communes)
INSERT INTO burundi_communes (province_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Gitega', 'Gitega', 'Gitega', 'Gitega', 'Gitega'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Bugendana', 'Bugendana', 'Bugendana', 'Bugendana', 'Bugendana'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Buhinyuza', 'Buhinyuza', 'Buhinyuza', 'Buhinyuza', 'Buhinyuza'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Makebuko', 'Makebuko', 'Makebuko', 'Makebuko', 'Makebuko'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Mutaho', 'Mutaho', 'Mutaho', 'Mutaho', 'Mutaho'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Nyabikere', 'Nyabikere', 'Nyabikere', 'Nyabikere', 'Nyabikere'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Ryansoro', 'Ryansoro', 'Ryansoro', 'Ryansoro', 'Ryansoro'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Shombo', 'Shombo', 'Shombo', 'Shombo', 'Shombo'),
((SELECT id FROM burundi_provinces WHERE name = 'Gitega'), 'Teka', 'Teka', 'Teka', 'Teka', 'Teka')
ON CONFLICT (province_id, name) DO NOTHING;

-- Insert Zones for Ntahangwa Commune (Bujumbura) - Most populated commune
INSERT INTO burundi_zones (commune_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Benga', 'Benga', 'Benga', 'Benga', 'Benga'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Buterere', 'Buterere', 'Buterere', 'Buterere', 'Buterere'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Cibitoke', 'Cibitoke', 'Cibitoke', 'Cibitoke', 'Cibitoke'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Gatumba', 'Gatumba', 'Gatumba', 'Gatumba', 'Gatumba'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Gihosha', 'Gihosha', 'Gihosha', 'Gihosha', 'Gihosha'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kamenge', 'Kamenge', 'Kamenge', 'Kamenge', 'Kamenge'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kinama', 'Kinama', 'Kinama', 'Kinama', 'Kinama'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kirekura', 'Kirekura', 'Kirekura', 'Kirekura', 'Kirekura'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mutimbuzi', 'Mutimbuzi', 'Mutimbuzi', 'Mutimbuzi', 'Mutimbuzi'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Ngagara', 'Ngagara', 'Ngagara', 'Ngagara', 'Ngagara'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Nyambuye', 'Nyambuye', 'Nyambuye', 'Nyambuye', 'Nyambuye'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Rubirizi', 'Rubirizi', 'Rubirizi', 'Rubirizi', 'Rubirizi'),
((SELECT id FROM burundi_communes WHERE name = 'Ntahangwa' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Rukaramu', 'Rukaramu', 'Rukaramu', 'Rukaramu', 'Rukaramu')
ON CONFLICT (commune_id, name) DO NOTHING;

-- Insert Zones for Mukaza Commune (Bujumbura) - Central business district
INSERT INTO burundi_zones (commune_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Centre Ville', 'Centre Ville', 'Centre Ville', 'Centre Ville', 'Centre Ville'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Rohero', 'Rohero', 'Rohero', 'Rohero', 'Rohero'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kiriri', 'Kiriri', 'Kiriri', 'Kiriri', 'Kiriri'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Buyenzi', 'Buyenzi', 'Buyenzi', 'Buyenzi', 'Buyenzi'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Bwiza', 'Bwiza', 'Bwiza', 'Bwiza', 'Bwiza'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kamesa', 'Kamesa', 'Kamesa', 'Kamesa', 'Kamesa'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Musaga', 'Musaga', 'Musaga', 'Musaga', 'Musaga'),
((SELECT id FROM burundi_communes WHERE name = 'Mukaza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Nyakabiga', 'Nyakabiga', 'Nyakabiga', 'Nyakabiga', 'Nyakabiga')
ON CONFLICT (commune_id, name) DO NOTHING;

-- Insert Zones for Muha Commune (Bujumbura)
INSERT INTO burundi_zones (commune_id, name, name_en, name_fr, name_rn, name_sw) VALUES
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kinyami', 'Kinyami', 'Kinyami', 'Kinyami', 'Kinyami'),
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Kigobe', 'Kigobe', 'Kigobe', 'Kigobe', 'Kigobe'),
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Sororezo', 'Sororezo', 'Sororezo', 'Sororezo', 'Sororezo'),
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mwaga', 'Mwaga', 'Mwaga', 'Mwaga', 'Mwaga'),
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Gikungu', 'Gikungu', 'Gikungu', 'Gikungu', 'Gikungu'),
((SELECT id FROM burundi_communes WHERE name = 'Muha' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Ngagara II', 'Ngagara II', 'Ngagara II', 'Ngagara II', 'Ngagara II')
ON CONFLICT (commune_id, name) DO NOTHING;

-- Insert sample zones for other Bujumbura communes
INSERT INTO burundi_zones (commune_id, name, name_en, name_fr, name_rn, name_sw) VALUES
-- Bubanza Commune
((SELECT id FROM burundi_communes WHERE name = 'Bubanza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Bubanza Centre', 'Bubanza Centre', 'Bubanza Centre', 'Bubanza Centre', 'Bubanza Centre'),
((SELECT id FROM burundi_communes WHERE name = 'Bubanza' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mpanda', 'Mpanda', 'Mpanda', 'Mpanda', 'Mpanda'),
-- Mpanda Commune
((SELECT id FROM burundi_communes WHERE name = 'Mpanda' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mpanda Centre', 'Mpanda Centre', 'Mpanda Centre', 'Mpanda Centre', 'Mpanda Centre'),
((SELECT id FROM burundi_communes WHERE name = 'Mpanda' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mparambo', 'Mparambo', 'Mparambo', 'Mparambo', 'Mparambo'),
-- Mugere Commune
((SELECT id FROM burundi_communes WHERE name = 'Mugere' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Mugere Centre', 'Mugere Centre', 'Mugere Centre', 'Mugere Centre', 'Mugere Centre'),
((SELECT id FROM burundi_communes WHERE name = 'Mugere' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Jabe', 'Jabe', 'Jabe', 'Jabe', 'Jabe'),
-- Isare Commune
((SELECT id FROM burundi_communes WHERE name = 'Isare' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Isare Centre', 'Isare Centre', 'Isare Centre', 'Isare Centre', 'Isare Centre'),
((SELECT id FROM burundi_communes WHERE name = 'Isare' AND province_id = (SELECT id FROM burundi_provinces WHERE name = 'Bujumbura')), 'Buhongo', 'Buhongo', 'Buhongo', 'Buhongo', 'Buhongo')
ON CONFLICT (commune_id, name) DO NOTHING;
