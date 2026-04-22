import { signal, computed, component, div, h1, p } from "@whisq/core";
import { s } from "../styles";
import { CounterRow } from "../components/CounterRow";
import { clamp } from "../lib/format";

export const Home = component(() => {
  const count = signal(0);
  const label = computed(() =>
    count.value === 0 ? "Click to start" : `Count: ${count.value}`,
  );

  // Keep count bounded — clamp is a pure utility from lib/, Whisq-free.
  const increment = () => {
    count.value = clamp(count.value + 1, -99, 99);
  };
  const decrement = () => {
    count.value = clamp(count.value - 1, -99, 99);
  };

  return div(
    h1({ class: s.heading }, "Home"),
    p({ class: s.text }, () => label.value),
    CounterRow({
      count: () => count.value,
      onIncrement: increment,
      onDecrement: decrement,
    }),
  );
});
