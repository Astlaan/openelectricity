import { rollup } from 'd3-array';
import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';
import transform from '$lib/utils/time-series-helpers/transform-stats-to-ts';
import meanReducer from '$lib/utils/time-series-helpers/reducer/mean';
import sumReducer from '$lib/utils/time-series-helpers/reducer/sum';
import withMinMax from '$lib/utils/time-series-helpers/with-min-max';
import transformRollingSum12Mth from '$lib/utils/rolling-sum-12-mth';
import rollUpMap from './rollup/map';

/**
 *
 * @param {StatsData[]} statsDatasets
 * @param {StatsInterval} statsInterval
 * @param {StatsType} statsType
 * @param {*} labelReducer
 * @param {*} colourReducer
 */
function TimeSeriesDatasets(statsDatasets, statsInterval, statsType, labelReducer, colourReducer) {
	/** @type {TimeSeriesData[]} */
	this.data = [];

	this.statsDatasets = statsDatasets;
	this.statsInterval = statsInterval;
	this.statsType = statsType || 'history';
	this.seriesNames = statsDatasets.map((d) => d.id);

	this.seriesLabels = statsDatasets.map((d) => (d.fuel_tech ? fuelTechName(d.fuel_tech) : ''));
	this.seriesColours = statsDatasets.map((d) =>
		d.fuel_tech ? fuelTechColour(d.fuel_tech) : '#fff'
	);

	if (labelReducer) {
		this.seriesLabels2 = statsDatasets.reduce(labelReducer, {});
	}
	if (colourReducer) {
		this.seriesColours2 = statsDatasets.reduce(colourReducer, {});
	}
}

TimeSeriesDatasets.prototype.transform = function () {
	this.data = transform(this.statsDatasets, this.statsInterval, this.statsType);
	return this;
};

TimeSeriesDatasets.prototype.rollup = function (
	/** @type {StatsInterval} */ targetStatsInterval,
	/** @type {'sum' | 'mean'} */ reducerType = 'sum'
) {
	const reducer = reducerType === 'mean' ? meanReducer : sumReducer;
	const getKey = rollUpMap(targetStatsInterval);
	const mappedDataWithKey = this.data.map((d) => {
		return {
			...d,
			key: getKey(d.time)
		};
	});

	const rolledUpData = rollup(
		mappedDataWithKey,
		(/** @type {TimeSeriesData[]} */ values) => reducer(values, this.seriesNames),
		(/** @type {TimeSeriesData} */ d) => d.key
	);
	this.data = [...rolledUpData.values()];
	return this;
};

TimeSeriesDatasets.prototype.calculate12MthRollingSum = function () {
	this.data = transformRollingSum12Mth(this.data, this.seriesNames);
	return this;
};

TimeSeriesDatasets.prototype.convertToPercentage = function (
	/** @type {string} */ id = 'au.total-minus-loads.history'
) {
	this.data = this.data.map((d) => {
		/** @type {TimeSeriesData} */
		const obj = {
			date: d.date,
			time: d.time
		};

		const total = /** @type {number} */ (d[id]);

		this.seriesNames.forEach((name) => {
			const seriesValue = /** @type {number} */ (d[name]);
			if (seriesValue && total) {
				obj[name] = (seriesValue / total) * 100;
			} else {
				obj[name] = 0;
			}
		});

		return obj;
	});

	return this;
};

TimeSeriesDatasets.prototype.updateMinMax = function (/** @type {string[]} */ loads = []) {
	this.data = withMinMax(this.data, this.seriesNames, loads);
	return this;
};

export default TimeSeriesDatasets;
