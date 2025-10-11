import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../constants/Colors';
import { EnergyPredictionService, PredictionResponse, ChartDataPoint, EnergyData } from '../services/EnergyPredictionService';
import { EnergyDataService } from '../services/EnergyDataService';
import { TestDataSeeder } from '../services/TestDataSeeder';

const { width } = Dimensions.get('window');

type FilterPeriod = 'daily' | 'weekly' | 'monthly';

const PredictiveModelScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (energyData && predictions) {
      updateChartData();
    }
  }, [selectedPeriod, energyData, predictions]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSeedTestData = async () => {
    try {
      setLoading(true);
      await TestDataSeeder.seedAllTestData();
      await loadData(); // Reload with new data
    } catch (error) {
      console.error('Error seeding test data:', error);
      setError('Failed to seed test data');
    } finally {
      setLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    try {
      console.log('🧪 Testing Gemini API key...');
      const isValid = await EnergyPredictionService.testApiKey();
      if (isValid) {
        alert('✅ Gemini API key is working!');
      } else {
        alert('❌ Gemini API key test failed. Check console for details.');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      alert('❌ Error testing API key');
    }
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

  const getChartConfig = () => ({
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'System',
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
    fillShadowGradient: Colors.primary,
    fillShadowGradientOpacity: 0.1,
  });

  const prepareChartData = () => {
    const pastData = chartData.filter(item => item.type === 'past').map(item => item.value);
    const predictedData = chartData.filter(item => item.type === 'predicted').map(item => item.value);
    const labels = chartData.map(item => item.label);

    return {
      labels: labels.slice(0, 8), // Limit to 8 points for better visibility
      datasets: [
        {
          data: pastData.slice(0, 8),
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green for past
          strokeWidth: 3,
        },
        {
          data: predictedData.slice(0, 8),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue for predicted
          strokeWidth: 3,
          strokeDashArray: [5, 5], // Dashed line for predictions
        },
      ],
    };
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {(['daily', 'weekly', 'monthly'] as FilterPeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.filterTab,
            selectedPeriod === period && styles.filterTabActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedPeriod === period && styles.filterTabTextActive,
            ]}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCards = () => {
    if (!predictions) return null;

    const stats = [
      {
        icon: 'flash-outline' as const,
        title: 'kWh Usage',
        value: EnergyDataService.formatKwh(energyData?.averageDailyKwh || 0),
        subtitle: 'Daily Average',
        color: Colors.primary,
      },
      {
        icon: 'card-outline' as const,
        title: 'Cost Estimate',
        value: EnergyDataService.formatCost(predictions.costEstimate.daily),
        subtitle: 'Per Day',
        color: '#F59E0B',
      },
      {
        icon: 'leaf-outline' as const,
        title: 'CO₂ Saved',
        value: EnergyDataService.formatCo2(predictions.co2Saved || 0),
        subtitle: 'Potential Savings',
        color: '#10B981',
      },
    ];

    return (
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: `${stat.color}15` }]}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            <Text style={styles.statsTitle}>{stat.title}</Text>
            <Text style={styles.statsValue}>{stat.value}</Text>
            <Text style={styles.statsSubtitle}>{stat.subtitle}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderInsights = () => {
    if (!predictions?.insights) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>✨ AI Insights</Text>
        {predictions.insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons
                name={
                  insight.type === 'warning'
                    ? 'warning-outline'
                    : insight.type === 'tip'
                    ? 'bulb-outline'
                    : 'information-circle-outline'
                }
                size={20}
                color={
                  insight.type === 'warning'
                    ? '#F59E0B'
                    : insight.type === 'tip'
                    ? '#10B981'
                    : '#3B82F6'
                }
              />
              <Text style={styles.insightTitle}>{insight.title}</Text>
            </View>
            <Text style={styles.insightDescription}>{insight.description}</Text>
          </View>
        ))}
        {predictions.confidence && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceText}>
              Prediction Confidence: {predictions.confidence}%
            </Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${predictions.confidence}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing your energy data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to Load Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Know Your Future Usage ⚡</Text>
        <View style={styles.headerActions}>
          {__DEV__ && (
            <>
              <TouchableOpacity 
                onPress={handleTestApiKey} 
                style={[styles.seedButton, { marginRight: 8 }]}
              >
                <Text style={styles.seedButtonText}>Test API</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSeedTestData} 
                disabled={loading}
                style={styles.seedButton}
              >
                <Text style={styles.seedButtonText}>Seed Data</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <Ionicons 
              name="refresh-outline" 
              size={24} 
              color={refreshing ? Colors.textSecondary : Colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Tabs */}
        {renderFilterTabs()}

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Energy Usage Trends</Text>
          <Text style={styles.chartSubtitle}>
            Past (Green) vs Predicted (Blue)
          </Text>
          
          {chartData.length > 0 && (
            <LineChart
              data={prepareChartData()}
              width={width - 32}
              height={220}
              chartConfig={getChartConfig()}
              bezier
              style={styles.chart}
              withDots={true}
              withShadow={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withInnerLines={false}
              withOuterLines={false}
            />
          )}
        </View>

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* AI Insights */}
        {renderInsights()}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seedButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  seedButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  insightsContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  insightDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default PredictiveModelScreen;
