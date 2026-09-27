-- Permitir recursos lingüísticos en texto plano además de PDF.
update storage.buckets
set allowed_mime_types=array['application/pdf','text/plain','text/csv']
where id='books';
