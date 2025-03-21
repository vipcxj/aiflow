import { NDArrayDType } from "./data-type";

class NDArray {
  public id: number;
  public dtype: NDArrayDType;
  public shape: number[];

  constructor(id: number, dtype: NDArrayDType, shape: number[]) {
    this.id = id;
    this.dtype = dtype;
    this.shape = shape;
  }
}

export default NDArray;