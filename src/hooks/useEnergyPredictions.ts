import { useState, useEffect } from 'react';
import {
  EnergyPredictionService,
  PredictionResponse,
  EnergyData,
  ChartDataPoint,
} from '../services/EnergyPredictionService';
import { EnergyDataService } from '../services/EnergyDataService';

type FilterPeriod = 'daily' | 'weekly' | 'monthly';

export const useEnergyPredictions = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const userData = await EnergyDataService.getUserEnergyData();
      if (userData) {
        setEnergyData(userData);
        const predictionData = await EnergyPredictionService.getPredictions(userData);
        setPredictions(predictionData);
      } else {
        setError('Unable to load energy data');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load energy data');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateChartData = () => {
    if (!energyData || !predictions) return;

    let pastData: number[] = [];
    let predictedData: number[] = [];

    switch (selectedPeriod) {
      case 'daily':
        pastData = energyData.last7Days || [];
        predictedData = predictions.predictions.next5Days;
        break;
      case 'weekly':
        pastData = energyData.last7Days || [];
        predictedData = predictions.predictions.nextWeek;
        break;
      case 'monthly':
        pastData = energyData.last30Days?.slice(-7) || energyData.last7Days || [];
        predictedData = predictions.predictions.nextMonth.slice(0, 7);
        break;
    }

    const newChartData = EnergyPredictionService.generateChartData(
      pastData,
      predictedData,
      selectedPeriod
    );
    setChartData(newChartData);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (energyData && predictions) {
      updateChartData();
    }
  }, [selectedPeriod, energyData, predictions]);

  return {
    selectedPeriod,
    setSelectedPeriod,
    loading,
    refreshing,
    energyData,
    predictions,
    chartData,
    error,
    refresh,
  };
};
