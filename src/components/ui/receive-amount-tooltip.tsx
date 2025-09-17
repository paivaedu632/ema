/**
 * Tooltip component showing breakdown of receive amount calculation
 */

import React from 'react';
import { Info } from 'lucide-react';

interface ReceiveAmountTooltipProps {
  breakdown: {
    gross: string;
    fees: string;
    slippage: string;
    net: string;
  };
  warnings: string[];
  isVisible: boolean;
  onToggle: () => void;
}

export function ReceiveAmountTooltip({ 
  breakdown, 
  warnings, 
  isVisible, 
  onToggle 
}: ReceiveAmountTooltipProps) {
  return (
    <div className="relative inline-block">
      <button
        onClick={onToggle}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        type="button"
      >
        <Info className="h-4 w-4" />
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="text-sm">
            <h4 className="font-semibold text-gray-900 mb-3">Detalhes do Cálculo</h4>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Valor bruto:</span>
                <span className="font-medium">{breakdown.gross}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de conversão (2%):</span>
                <span className="font-medium text-red-600">-{breakdown.fees}</span>
              </div>
              {breakdown.slippage !== '0 EUR' && breakdown.slippage !== '0 AOA' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Proteção deslizamento:</span>
                  <span className="font-medium text-yellow-600">-{breakdown.slippage}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Valor garantido:</span>
                <span className="font-bold text-green-600">{breakdown.net}</span>
              </div>
            </div>
            
            {warnings.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <h5 className="font-medium text-yellow-700 mb-2 flex items-center">
                  <span className="mr-1">⚠️</span>
                  Avisos Importantes
                </h5>
                <ul className="space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-xs text-gray-600 leading-relaxed">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-3 mt-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                * O valor garantido é o mínimo que você receberá considerando taxas, 
                proteção contra deslizamento e condições de liquidez atuais.
              </p>
            </div>
          </div>
          
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200"></div>
            <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-white absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px"></div>
          </div>
        </div>
      )}
    </div>
  );
}
