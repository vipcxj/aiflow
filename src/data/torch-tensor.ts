import { TorchTensorDType } from "./data-type";

class TorchTensor {
  public id: number;
  public dtype: TorchTensorDType;
  public shape: number[];

  constructor(id: number, dtype: TorchTensorDType, shape: number[]) {
    this.id = id;
    this.dtype = dtype;
    this.shape = shape;
  }
}

export default TorchTensor;