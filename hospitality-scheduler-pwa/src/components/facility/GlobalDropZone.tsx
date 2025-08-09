'use client'

import { Upload, FileSpreadsheet } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

export function GlobalDropZone() {
  const { t } = useTranslations()
  return (
    <div className="fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md mx-4 text-center border-2 border-dashed border-blue-300">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileSpreadsheet className="w-10 h-10 text-blue-600" />
        </div>
        
        <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {t('common.dropFile')}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {t('common.releaseFile')}
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Upload className="w-4 h-4" />
          {t('common.fileSupport')}
        </div>
      </div>
    </div>
  )
}