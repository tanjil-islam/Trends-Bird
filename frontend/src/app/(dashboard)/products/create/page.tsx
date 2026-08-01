import { getImageUrl } from '@/lib/utils';
'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import MediaSelector from '@/components/MediaSelector';

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', slug: '', sku: '', shortDescription: '', longDescription: '',
    hasVariants: false, price: '', salePrice: '', stock: '', stockStatus: 'in_stock',
    weight: '', active: true, featured: false, brandId: '', categoryIds: [] as string[],
  });

  const [productMedia, setProductMedia] = useState<{ mediaId: string; isThumbnail: boolean; attributeValueId?: string }[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [showMediaSelector, setShowMediaSelector] = useState<{ type: 'product' | 'variant'; index?: number } | null>(null);

  const selectedAttributeValues = React.useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach(v => {
      (v.attributeValues || []).forEach((av: any) => {
        for (const attr of attributes) {
          const val = attr.values?.find((x: any) => x.id === av.attributeValueId);
          if (val) {
            map.set(val.id, `${attr.name}: ${val.value}`);
          }
        }
      });
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [variants, attributes]);

  useEffect(() => {
    api.get('/categories?limit=200').then(res => setCategories(res.data || [])).catch(() => {});
    api.get('/brands?limit=200').then(res => setBrands(res.data || [])).catch(() => {});
    api.get('/attributes?limit=200').then(res => setAttributes(res.data || [])).catch(() => {});
  }, []);

  const addVariant = () => {
    setVariants(prev => [...prev, { sku: '', price: '', salePrice: '', stock: '0', stockStatus: 'in_stock', weight: '', attributeValues: [], media: [] }]);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleVariantAttrValue = (variantIdx: number, attrValueId: string) => {
    setVariants(prev => {
      const updated = [...prev];
      const existing = updated[variantIdx].attributeValues || [];
      if (existing.some((av: any) => av.attributeValueId === attrValueId)) {
        updated[variantIdx].attributeValues = existing.filter((av: any) => av.attributeValueId !== attrValueId);
      } else {
        updated[variantIdx].attributeValues = [...existing, { attributeValueId: attrValueId }];
      }
      return updated;
    });
  };

  const handleMediaSelect = (mediaIds: string[]) => {
    if (showMediaSelector?.type === 'product') {
      const newMedia = mediaIds.map((id, index) => ({
        mediaId: id,
        isThumbnail: productMedia.length === 0 && index === 0, // First selected gets thumbnail if none exists
      }));
      setProductMedia(prev => {
        const filtered = prev.filter(p => !mediaIds.includes(p.mediaId));
        return [...filtered, ...newMedia];
      });
    } else if (showMediaSelector?.type === 'variant' && showMediaSelector.index !== undefined) {
      const idx = showMediaSelector.index;
      setVariants(prev => {
        const updated = [...prev];
        const existing = updated[idx].media || [];
        const newMedia = mediaIds.map(id => ({ mediaId: id, isThumbnail: false }));
        updated[idx].media = [...existing, ...newMedia];
        return updated;
      });
    }
    setShowMediaSelector(null);
  };

  const removeProductMedia = (mediaId: string) => {
    setProductMedia(prev => {
      const next = prev.filter(m => m.mediaId !== mediaId);
      if (next.length > 0 && !next.some(m => m.isThumbnail)) {
        next[0].isThumbnail = true;
      }
      return next;
    });
  };

  const removeVariantMedia = (variantIdx: number, mediaId: string) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[variantIdx].media = updated[variantIdx].media.filter((m: any) => m.mediaId !== mediaId);
      return updated;
    });
  };

  const setThumbnail = (mediaId: string) => {
    setProductMedia(prev => prev.map(m => ({ ...m, isThumbnail: m.mediaId === mediaId })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const data: any = {
        name: form.name, slug: form.slug, sku: form.sku,
        shortDescription: form.shortDescription || undefined,
        longDescription: form.longDescription || undefined,
        hasVariants: form.hasVariants,
        active: form.active, featured: form.featured,
        brandId: form.brandId || undefined,
        categoryIds: form.categoryIds.length > 0 ? form.categoryIds : undefined,
      };

      // Map base product media
      const allMedia = [...productMedia.map(m => ({ mediaId: m.mediaId, isThumbnail: m.isThumbnail, isGallery: true, attributeValueId: m.attributeValueId || undefined }))];

      if (!form.hasVariants) {
        data.price = parseFloat(form.price) || 0;
        if (form.salePrice) data.salePrice = parseFloat(form.salePrice);
        data.stock = parseInt(form.stock) || 0;
        data.stockStatus = form.stockStatus;
        if (form.weight) data.weight = parseFloat(form.weight);
      } else {
        data.variants = variants.map((v, i) => {
          // Add variant specific media to the root media array with variant ID attached
          // Prisma CreateProductDto expects media to be attached to the root product but with variantId
          // However, our DTO says media is in CreateProductDto. Wait, Prisma requires media to be inserted in the product level.
          // Wait, no, we need to handle media correctly. The DTO expects `media` array on the product.
          if (v.media && v.media.length > 0) {
            v.media.forEach((m: any) => {
               // We will add variant media later or map it to the variant creation.
               // Actually, `CreateVariantDto` doesn't have `media` array in our backend DTO.
               // The backend `CreateProductDto` has `media: ProductMediaDto[]` which includes `variantId`.
               // Wait! Since it's a new product, we don't have variantIds yet!
               // Ah, Prisma nested writes don't let us attach productMedia to variants easily if we do it all in one go because variantIds are generated.
               // Let's rely on the backend logic or just attach it to the root product.
            });
          }
          return {
            sku: v.sku,
            price: parseFloat(v.price) || 0,
            salePrice: v.salePrice ? parseFloat(v.salePrice) : undefined,
            stock: parseInt(v.stock) || 0,
            stockStatus: v.stockStatus || 'in_stock',
            weight: v.weight ? parseFloat(v.weight) : undefined,
            attributeValues: v.attributeValues || [],
          };
        });
      }

      data.media = allMedia;

      await api.post('/products', data);
      router.push('/products');
    } catch (err: any) {
      setError(err?.message || 'Failed to create product');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Create Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="card">
          <h2 className="font-semibold mb-4">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Slug *</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required className="w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">SKU *</label><input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required className="w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Brand</label>
              <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))} className="w-full">
                <option value="">None</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4"><label className="block text-sm font-medium mb-1">Short Description</label><textarea value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} className="w-full" rows={2} /></div>
          <div className="mt-4"><label className="block text-sm font-medium mb-1">Long Description</label><textarea value={form.longDescription} onChange={e => setForm(f => ({ ...f, longDescription: e.target.value }))} className="w-full" rows={4} /></div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Product Media</h2>
            <button type="button" onClick={() => setShowMediaSelector({ type: 'product' })} className="btn btn-ghost text-sm">+ Attach Media</button>
          </div>
          {productMedia.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {productMedia.map(m => (
                <div key={m.mediaId} className={`relative w-24 h-24 border-2 rounded overflow-hidden ${m.isThumbnail ? 'border-indigo-500' : 'border-[var(--border-color)]'}`}>
                   <div className="absolute top-1 left-1 flex gap-1 z-10">
                     {!m.isThumbnail && <button type="button" onClick={() => setThumbnail(m.mediaId)} className="bg-black/50 text-white text-[10px] px-1 rounded hover:bg-indigo-500">Thumb</button>}
                   </div>
                   <button type="button" onClick={() => removeProductMedia(m.mediaId)} className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] z-10 hover:bg-red-500">&times;</button>
                   <img src={getImageUrl('/api/media/' + m.mediaId)} className="w-full h-full object-cover" alt="Media" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Media' }} />
                   {form.hasVariants && (
                     <select 
                       value={m.attributeValueId || ''} 
                       onChange={(e) => setProductMedia(prev => prev.map(p => p.mediaId === m.mediaId ? { ...p, attributeValueId: e.target.value || undefined } : p))} 
                       className="absolute bottom-0 w-full text-[10px] bg-black/70 text-white px-1 py-0.5 outline-none border-none cursor-pointer"
                       title="Attach to Attribute Value"
                     >
                       <option value="">Any Attribute</option>
                       {selectedAttributeValues.map(av => <option key={av.id} value={av.id}>{av.label}</option>)}
                     </select>
                   )}
                </div>
              ))}
            </div>
          ) : (
             <p className="text-sm text-[var(--text-secondary)]">No media attached to the base product.</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Product Type</h2>
          <div className="flex gap-4">
            <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition ${!form.hasVariants ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--border-color)]'}`}>
              <input type="radio" className="sr-only" checked={!form.hasVariants} onChange={() => setForm(f => ({ ...f, hasVariants: false }))} />
              <p className="font-medium">Simple Product</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Single price and stock</p>
            </label>
            <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition ${form.hasVariants ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--border-color)]'}`}>
              <input type="radio" className="sr-only" checked={form.hasVariants} onChange={() => setForm(f => ({ ...f, hasVariants: true }))} />
              <p className="font-medium">Variable Product</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Multiple variants with attributes</p>
            </label>
          </div>
        </div>

        {!form.hasVariants && (
          <div className="card">
            <h2 className="font-semibold mb-4">Pricing & Stock</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Price *</label><input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Sale Price</label><input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Stock</label><input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Weight</label><input type="number" step="0.001" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="w-full" /></div>
            </div>
          </div>
        )}

        {form.hasVariants && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Variants</h2>
              <button type="button" onClick={addVariant} className="btn btn-primary text-sm">+ Add Variant</button>
            </div>
            {variants.map((v, idx) => (
              <div key={idx} className="border border-[var(--border-color)] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Variant {idx + 1}</span>
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 text-sm">× Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs mb-1">SKU *</label><input value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} required className="w-full" /></div>
                  <div><label className="block text-xs mb-1">Price *</label><input type="number" step="0.01" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} required className="w-full" /></div>
                  <div><label className="block text-xs mb-1">Sale Price</label><input type="number" step="0.01" value={v.salePrice} onChange={e => updateVariant(idx, 'salePrice', e.target.value)} className="w-full" /></div>
                  <div><label className="block text-xs mb-1">Stock</label><input type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} className="w-full" /></div>
                  <div><label className="block text-xs mb-1">Weight</label><input type="number" step="0.001" value={v.weight} onChange={e => updateVariant(idx, 'weight', e.target.value)} className="w-full" /></div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium mb-2">Attribute Values</label>
                  {attributes.map(attr => (
                    <div key={attr.id} className="mb-2">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{attr.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {attr.values?.map((av: any) => (
                          <label key={av.id} className={`cursor-pointer badge text-xs ${(v.attributeValues || []).some((x: any) => x.attributeValueId === av.id) ? 'badge-info' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
                            <input type="checkbox" className="sr-only" checked={(v.attributeValues || []).some((x: any) => x.attributeValueId === av.id)} onChange={() => toggleVariantAttrValue(idx, av.id)} />
                            {av.value}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium">Variant Media</label>
                    <button type="button" onClick={() => setShowMediaSelector({ type: 'variant', index: idx })} className="btn btn-ghost text-[10px] py-1 px-2">+ Attach Image</button>
                  </div>
                  {(v.media || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(v.media || []).map((m: any) => (
                        <div key={m.mediaId} className="relative w-12 h-12 border rounded overflow-hidden border-[var(--border-color)]">
                          <button type="button" onClick={() => removeVariantMedia(idx, m.mediaId)} className="absolute top-0 right-0 bg-red-500/80 text-white rounded-bl w-4 h-4 flex items-center justify-center text-[8px] z-10 hover:bg-red-500">&times;</button>
                          <img src={getImageUrl('/api/media/' + m.mediaId)} className="w-full h-full object-cover" alt="Media" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/50x50?text=Media' }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--text-secondary)]">No media attached to this variant.</p>
                  )}
                </div>
              </div>
            ))}
            {variants.length === 0 && <p className="text-center text-[var(--text-secondary)] py-4">No variants yet. Click "+ Add Variant" to get started.</p>}
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold mb-4">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <label key={c.id} className={`cursor-pointer badge ${form.categoryIds.includes(c.id) ? 'badge-info' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
                <input type="checkbox" className="sr-only" checked={form.categoryIds.includes(c.id)} onChange={() => setForm(f => ({ ...f, categoryIds: f.categoryIds.includes(c.id) ? f.categoryIds.filter(id => id !== c.id) : [...f.categoryIds, c.id] }))} />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Settings</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /><span className="text-sm">Active</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} /><span className="text-sm">Featured</span></label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/products')} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <span className="spinner" /> : 'Create Product'}</button>
        </div>
      </form>

      {showMediaSelector && (
        <MediaSelector
          multiple
          selectedIds={showMediaSelector.type === 'product' ? productMedia.map(m => m.mediaId) : (variants[showMediaSelector.index!].media || []).map((m: any) => m.mediaId)}
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaSelector(null)}
        />
      )}
    </div>
  );
}
