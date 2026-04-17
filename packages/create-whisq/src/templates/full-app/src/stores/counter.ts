import { signal, computed } from "@whisq/core";

export const count = signal(0);
export const doubled = computed(() => count.value * 2);

export const increment = () => {
  count.value++;
};
export const decrement = () => {
  count.value--;
};
export const reset = () => {
  count.value = 0;
};
