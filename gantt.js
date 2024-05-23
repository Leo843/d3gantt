import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/************************************************************************/
/* constants                                                            */
/************************************************************************/

// An array used to convert indexes from Date.getDay() into the name of the
// corresponding day.
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// An array used to convert indexes from Date.getMonth() into the name of the
// corresponding month.
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

// The array of public holidays so far (should be updated)
const publicHolidays = [
  {date:new Date("2024-01-01"), brief: "1er janvier"},
  {date:new Date("2024-04-01"), brief: "Lundi de Pâques"},
  {date:new Date("2024-05-01"), brief: "1er mai"},
  {date:new Date("2024-05-08"), brief: "8 mai"},
  {date:new Date("2024-05-09"), brief: "Ascension"},
  {date:new Date("2024-05-20"), brief: "Lundi de Pentecôte"},
  {date:new Date("2024-07-14"), brief: "14 juillet"},
  {date:new Date("2024-08-15"), brief: "Assomption"},
  {date:new Date("2024-11-01"), brief: "Toussaint"},
  {date:new Date("2024-11-11"), brief: "11 novembre"},
  {date:new Date("2024-12-25"), brief: "Jour de Noël"}
];

/************************************************************************/
/* Definitions                                                          */
/************************************************************************/

// A Month Object is defined as follow.
//
// {
//   year: number,      // The year associated to the Month Object.
//   month: number,     // The index of the month (January is 0).
//   days: Array<Date>, // The array of dates for this month.
// }
//
// Month Objects are helper objects created and used during the construction of
// the Gantt chart.

/************************************************************************/
/* functions                                                            */
/************************************************************************/

// Return the earliest Date Object
function earliestOf(date0, date1)
{
  return date0 < date1 ? date0 : date1;
}

// Return the latest Date Object
function latestOf(date0, date1)
{
  return date0 > date1 ? date0 : date1;
}

// Return the day following the given Date Object
function getTomorrow(date)
{
  const x = new Date(date);
  x.setDate(x.getDate() + 1);
  return x;
}

// Convert milliseconds to days
function toDays(milliseconds)
{
  const aDayInMilliseconds = 1000*60*60*24;
  return Math.floor(milliseconds/aDayInMilliseconds);
}

// Create a Span Object from two Date objects
function Span(start, end)
{
  return {
    // Return true if this Span object contains the given Date object (including
    // the first and the last day of the Span object).
    contains (date)
    {
      return start <= date && date <= end;
    }
  }
}

// Return an array of consecutive Date objects from `start` to `end` (including
// `end`)
function getDateRange(start, end)
{
  let dateRange = []
  for(let d = start; d <= end; d = getTomorrow(d))
  {
    dateRange.push(d)
  }
  return dateRange;
};

// Return an array of Month objects from `start` to `end`.
function getMonthRange(start, end)
{
  let monthRange = {}
  for(let d = start; d <= end; d = getTomorrow(d))
  {
    const keyMonth = d.getMonth().toString().padStart(2, '0');
    const keyYear  = d.getFullYear().toString();
    const key      = keyYear + keyMonth

    if (key in monthRange)
    {
      monthRange[key].days.push(d);
    }
    else
    {
      monthRange[key] = {
        year: d.getFullYear(),
        month: d.getMonth(),
        days: [d],
      }
    }
  }
  return Object.values(monthRange);
}

/************************************************************************/
/*                                                                      */
/************************************************************************/

export function createGantt(datum, options = {})
{
  /**********************************************************************/
  /* options                                                            */
  /**********************************************************************/

  const defaultOptions = {
    cellWidth: 20,
    cellHeight: 20,
    yAxisWidth: 200,
  }

  const {
    cellWidth,
    cellHeight,
    yAxisWidth
  } = { ...defaultOptions, ...options };

  const now = Date.now();

  const lastDay = datum.map(
    ({spans}) => spans.map(
      ({start, end}) => latestOf(start, end)
    ).reduce(
      (acc, cur) => latestOf(acc, cur), 0
    )
  ).reduce(
    (acc, cur) => latestOf(acc, cur), 0
  );

  const firstDay = datum.map(
    ({spans}) => spans.map(
      ({start, end}) => earliestOf(start, end)
    ).reduce(
      (acc, cur) => earliestOf(acc, cur), lastDay
    )
  ).reduce(
    (acc, cur) => earliestOf(acc, cur), lastDay
  );

  const dateRange  = getDateRange(firstDay, lastDay);
  const monthRange = getMonthRange(firstDay, lastDay);

  const width      = cellWidth*dateRange.length + yAxisWidth;
  const height     = (datum.length + 2)*cellHeight;

  /**********************************************************************/
  /* tooltip                                                            */
  /**********************************************************************/

  const tooltip = d3.create("div")
    .attr("class", "gantt-tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")

  /**********************************************************************/
  /* svg                                                                */
  /**********************************************************************/

  const svg = d3.create("svg")
    .attr("class", "gantt")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])

  const chart = svg.append("g")
    .attr("transform", `translate(${yAxisWidth},0)`)

  // Create a g element to group elements related to the x axis.
  const xAxis = chart.append("g")
    .attr("transform", `translate(0,0)`)
    .attr("class", "gantt-xaxis")

  // Create a g element to group elements related to the first section of the x
  // axis.
  const xAxis0 = xAxis.append("g")
    .attr("transform", `translate(0,${1*cellHeight})`)
    .attr("class", "gantt-xaxis0")

  // Create rect elements to display the background of each day on the x axis.
  xAxis0
    .selectAll("rect")
    .data(dateRange)
    .join("rect")
    .attr("transform", (_, i) => `translate(${i*cellWidth},0)`)
    .attr("width" , cellWidth  - 1)
    .attr("height", cellHeight - 1)

  // Create text elements to display the day on the x axis.
  xAxis0
    .selectAll("text")
    .data(dateRange)
    .join("text")
    .attr("transform", (_, i) => `translate(${i*cellWidth},0)`)
    .attr("x", cellWidth/2)
    .attr("y", cellHeight/2)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .text((date) => date.getDate());

  // Create a g element to group elements related to the second section of the x
  // axis.
  const xAxis1 = xAxis.append("g")
    .attr("transform", `translate(0,${0*cellHeight})`)
    .attr("class", "gantt-xaxis1")

  // Create rect elements to display the background of each month on the x axis.
  xAxis1
    .selectAll("rect")
    .data(monthRange)
    .join("rect")
      .attr("transform", ({days}) => `translate(${toDays(days[0] - firstDay)*cellWidth},0)`)
      .attr("width", ({days}) => (days.length*cellWidth - 1))
      .attr("height", cellHeight)

  // Create text elements to display the name of each month on the x axis.
  xAxis1
    .selectAll("text")
    .data(monthRange)
    .join("text")
      .attr("transform", ({days}) => `translate(${toDays(days[0] - firstDay)*cellWidth},0)`)
      .attr("x", ({days}) => (days.length*cellWidth/2))
      .attr("y", cellHeight/2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .text(({month, year}) => `${monthNames[month]}, ${year}`);

  // Create rect elements for each weekend.
  chart.append("g")
    .attr("transform", `translate(0,0)`)
    .attr("class", "gantt-we")
    .selectAll("rect")
    .data(dateRange.filter((d) => [0,6].includes(d.getDay())))
    .join("rect")
      .attr("transform", (d) => `translate(${toDays(d - firstDay)*cellWidth},${2*cellHeight})`)
      .attr("width", cellWidth - 1)
      .attr("height", datum.length*cellHeight - 1)
      .attr("rx", 4)
      .on("mouseover", function(e, d) {
        tooltip.text(dayNames[d.getDay()]);
        tooltip.style("visibility", "visible");
      })
      .on("mousemove", function({pageX, pageY}) {
        tooltip
          .style("top", (pageY+5)+"px")
          .style("left",(pageX+5)+"px");
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
      });

  // Create rect elements for each public holidays.
  chart.append("g")
    .attr("transform", `translate(0,0)`)
    .attr("class", "gantt-ph")
    .selectAll("rect")
    .data((function (){
      const times = dateRange.map((date) => date.getTime())
      return publicHolidays.filter(({date}) => times.includes(date.getTime()))
    })())
    .join("rect")
    .attr("transform", ({date}) => `translate(${toDays(date - firstDay)*cellWidth},${2*cellHeight})`)
      .attr("width", cellWidth - 1)
      .attr("height", datum.length*cellHeight - 1)
      .attr("rx", 4)
    .on("mouseover", function(e, {brief}) {
          tooltip.text(brief);
          tooltip.style("visibility", "visible");
      })
      .on("mousemove", function({pageX, pageY}) {
        tooltip
          .style("top", (pageY+5)+"px")
          .style("left",(pageX+5)+"px");
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
      });

  // Create g elements to group elements related to tasks.
  const task = chart.append("g")
    .attr("transform", `translate(0,${2*cellHeight})`)
    .selectAll("g")
    .data(datum)
    .join("g")
      .attr("transform", (_, i) => `translate(0,${i*cellHeight})`)

  // Helper function that returns the content of the class attribute for spans.
  function getSpanClassAttr({start, end, classname})
  {
    const classnames = ["gantt-task"];

    if (Span(start, end).contains(now))
    {
      classnames.push("gantt-task-active");
    }
    else
    {
      classnames.push("gantt-task-inactive");
    }

    if (end < now)
    {
      classnames.push("gantt-task-past");
    }

    if (now < start)
    {
      classnames.push("gantt-task-future");
    }

    if (classname && classname.length)
    {
      classnames.push(classname);
    }

    return classnames.join(" ");
  }

  // Create g elements to group elements related to each span.
  const span = task.selectAll("g")
    .data(({spans}) => spans)
    .join("g")
      .attr("transform", ({start}) => `translate(${cellWidth*toDays(start - firstDay)},0)`)
      .attr("class", getSpanClassAttr)

  // Create rect elements to display a background for each span.
  span.append("rect")
    .attr("width", ({start, end}) => (cellWidth*(toDays(end - start) +1) - 1) )
    .attr("height", cellHeight - 1)
    .attr("rx", 4)
    .on("mouseover", function(e, {tooltip: desc}) {
      if (desc && desc.length) {
        tooltip.text(desc);
        tooltip.style("visibility", "visible");
      }
    })
    .on("mousemove", function({pageX, pageY}) {
      tooltip
        .style("top", (pageY+5)+"px")
        .style("left",(pageX+5)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  // Create text elements to display the brief property of each span.
  span.append("text")
    .attr("width", ({start, end}) => (cellWidth*(toDays(end - start) +1) - 1) )
    .attr("height", cellHeight - 1)
    .attr("x", ({start, end}) => (cellWidth*(toDays(end - start) + 1)/2))
    .attr("y", cellHeight/2)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("pointer-events", "none")
    .text(({brief}) => brief)

  // Create text elements to display the name of each task on the yAxis
  task.append("text")
    .attr("class", "gantt-task-name")
    .attr("x", -5)
    .attr("y", cellHeight/2)
    .attr("width", yAxisWidth)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("fill", "white")
    .text(({name}) => name)
    .on("mouseover", function(e, {tooltip: desc}) {
      if (desc && desc.length) {
        tooltip.text(desc);
        tooltip.style("visibility", "visible");
      }
    })
    .on("mousemove", function({pageX, pageY}) {
      tooltip
        .style("top", (pageY+5)+"px")
        .style("left",(pageX+5)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  // Create a rect to highlight the current day in the chart.
  if (Span(firstDay, lastDay).contains(now))
  {
    chart.append("rect")
      .attr("transform", `translate(${toDays(now - firstDay)*cellWidth},0)`)
      .attr("class", "gantt-today")
      .attr("width", cellWidth - 1)
      .attr("height", (2 + datum.length)*cellHeight - 1)
      .attr("rx", 4)
  }

  return {svg, tooltip};
}
